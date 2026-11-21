(() => {
'use strict';
const $ = id => document.getElementById(id);
const TABLE = 'devobase_personal_studies';
const LOCAL_KEY = 'devobase:personal-studies:v1';
let client = null, user = null, localStudies = [], studies = [], activeId = null;
let mode = 'browser', editMode = false, timer = null, revision = 0, saving = null;
let savedRange = null;
const records = () => studies;
const active = () => records().find(x => x.id === activeId);
function status(value) { $('status').textContent = value; $('cloudStatus').textContent = value; }
function escapeHTML(value) {return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
function sanitize(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const allowed = new Set(['P','DIV','BR','H2','H3','H4','BLOCKQUOTE','UL','OL','LI','STRONG','B','EM','I','U']);
  function walk(root) {
    for(const n of [...root.childNodes]) {
      if(n.nodeType === 8) {n.remove();continue;}
      if(n.nodeType !== 1) continue;
      if(!allowed.has(n.tagName)) {
        if (['SCRIPT','STYLE','IFRAME','SVG','OBJECT','FORM','TEMPLATE'].includes(n.tagName)) { n.remove();continue; }
        const text = document.createTextNode(n.textContent || '');
        n.replaceWith(text);continue;
      }
      for(const attr of [...n.attributes]) n.removeAttribute(attr.name);
      walk(n);
    }
  }
  walk(template.content);
  return template.innerHTML;
}
function loadBrowser() {try {const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');localStudies = Array.isArray(raw) ? raw.filter(x => x && typeof x.id === 'string') : [];} catch {localStudies=[];}}
function saveBrowser() {try {localStorage.setItem(LOCAL_KEY, JSON.stringify(localStudies));sourcePicker();return true;} catch {status('Browser storage is full. Export your study.');return false;}}
function sourcePicker() {
 const picker = $('localSource');
 const prior = picker.value;
 picker.replaceChildren();
 for(const r of localStudies){const option=document.createElement('option');option.value=r.id;option.textContent=r.title||'Untitled study';picker.append(option);}
 if(localStudies.some(r=>r.id===prior))picker.value=prior;
 picker.hidden = !localStudies.length || mode !== 'account';
}
function updateMode(){
 const cloud = mode === 'account';
 $('modeSwitch').textContent = cloud ? 'Browser drafts' : 'Account studies';
 $('copyLocal').hidden = !cloud || !localStudies.length;
 $('modeLabel').textContent = cloud ? 'Account studies' : 'Browser drafts';
 $('cloudNotice').textContent = cloud ? 'Shared DevoBase login. Changes are saved to your account.' : 'Drafts on this device only.';
 sourcePicker();
}
function capture() {
 const r = active();if(!r)return null;
 if(editMode) {r.title=$('title').value;r.scripture_ref=$('reference').value;r.content_html=sanitize($('editor').innerHTML);}
 else r.content_html=sanitize($('readerContent').innerHTML);
 r.updated_at=new Date().toISOString();revision++;
 return r;
}
function renderChooser(){
 const picker=$('studyChooser');picker.replaceChildren();
 for(const r of studies){const o=document.createElement('option');o.value=r.id;o.textContent=r.title||'Untitled study';picker.append(o);}
 picker.value=activeId||'';
 picker.hidden=!studies.length;
}
function render(){
 const r=active();savedRange=null;renderChooser();
 $('empty').hidden=!!r;
 $('reader').hidden=!r;
 $('editToggle').disabled=!r;
 $('underline').disabled=!r;
 $('floatingUnderline').hidden=true;
 if(!r){$('workarea').hidden=true;return;}
 $('readerTitle').textContent=r.title||'Untitled study';
 $('readerReference').textContent=r.scripture_ref??r.reference??'';
 $('readerContent').innerHTML=sanitize(r.content_html??r.content??'');
 $('readerContent').contentEditable='true';
 $('readerContent').setAttribute('spellcheck','false');
 $('title').value=r.title||'';
 $('reference').value=r.scripture_ref??r.reference??'';
 $('editor').innerHTML=sanitize(r.content_html??r.content??'');
 $('workarea').hidden=!editMode;
 $('editToggle').textContent=editMode?'Close editor':'Edit study';
 $('editToggle').setAttribute('aria-pressed',String(editMode));
 const i=studies.findIndex(x=>x.id===activeId);
 $('previous').disabled=i<=0;
 $('next').disabled=i>=studies.length-1;
}
async function updateCloud(snapshot) {
 if(!client||!user)throw new Error('Sign in required');
 const draft={title:snapshot.title,scripture_ref:snapshot.scripture_ref,content_html:snapshot.content_html,updated_at:snapshot.updated_at};
 const {data,error}=await client.from(TABLE).update(draft).eq('id',snapshot.id).eq('user_id',user.id).select('id');
 if(error)throw error;
 if(!data?.length)throw new Error('Could not save: study not found or access denied');
}
async function save(){
 clearTimeout(timer);timer=null;
 if(saving){const pending=await saving;if(!pending)return false;}
 const r=capture();if(!r)return true;
 const snapshot={...r}, start=revision;
 if(mode==='browser'){
   const ok=saveBrowser();status(ok?'Saved on this device':'Save failed; export your study');return ok;
 }
 status('Saving…');
 const operation=(async()=>{
   try {await updateCloud(snapshot);return true;}
   catch(e){status('Save failed: '+e.message+' (export your study)');return false;}
 })();
 saving=operation;
 const success=await operation;
 if(saving===operation)saving=null;
 if(success) {
   if(revision===start)status('Saved to your account');
   else {status('Saving latest changes…');schedule();}
 }
 return success;
}
function schedule(){
 clearTimeout(timer);status(mode==='account'?'Saving…':'Saving on device…');
 timer=setTimeout(()=>{save();},650);
}
async function selectStudy(id){
 if(id===activeId)return;
 if(!(await save()))return;
 activeId=id;editMode=false;render();status(mode==='account'?'Account studies':'Browser drafts');
 window.scrollTo({top:0,behavior:'instant'});
}
async function refreshAccount(){
 if(!client||!user)return false;
 status('Loading account studies…');
 const {data,error}=await client.from(TABLE).select('id,title,scripture_ref,content_html,series_name,series_order,updated_at')
   .eq('user_id',user.id).order('series_order',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});
 if(error){status('Account studies unavailable: '+error.message);return false;}
 studies=data||[];mode='account';activeId=studies[0]?.id||null;editMode=false;updateMode();render();status('Account studies ready');return true;
}
async function toggleMode(){
 if(!(await save()))return;
 if(mode==='account'){studies=localStudies;mode='browser';activeId=studies[0]?.id||null;editMode=false;updateMode();render();status('Browser drafts');}
 else if(user)await refreshAccount();
 else status('Sign in using your existing DevoBase account.');
}
async function addStudy(){
 if(!(await save()))return;
 const content='<h2>Comprehension | What does the text say?</h2><p>1. What do you observe?</p><h2>Interpretation | What does it mean?</h2><p>2. What does the context reveal?</p><h2>Application | How should the text change me?</h2><p>3. What have you learned about God?</p>';
 const item={id:crypto.randomUUID(),title:'New Bible Study',scripture_ref:'',content_html:content,updated_at:new Date().toISOString()};
 if(mode==='account'){
   if(!user)return status('Sign in first.');
   const {data,error}=await client.from(TABLE).insert({...item,user_id:user.id}).select('id,title,scripture_ref,content_html,updated_at').single();
   if(error)return status('Unable to create study: '+error.message);
   studies=[...studies,data];activeId=data.id;
 }else {localStudies=[...localStudies,item];studies=localStudies;activeId=item.id;saveBrowser();}
 editMode=true;updateMode();render();$('title').focus();
}
function download(){
 const r=active();if(!r)return;
 capture();
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+escapeHTML(r.title)+'</title><style>body{max-width:680px;margin:50px auto;padding:20px;font:17px/1.8 Georgia,serif;color:#211c14}u{text-underline-offset:4px}article{overflow-wrap:anywhere}</style></head><body><h1>'+escapeHTML(r.title)+'</h1><p>'+escapeHTML(r.scripture_ref)+'</p><article>'+sanitize(r.content_html)+'</article></body></html>';
 const url=URL.createObjectURL(new Blob([html],{type:'text/html'})),a=document.createElement('a');
 a.href=url;a.download=(r.title||'bible-study').replace(/[^a-z0-9-_]+/gi,'-')+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function deleteStudy(){
 const r=active();if(!r||!confirm('Permanently delete this study? Export a copy first if you need a backup.'))return;
 if(!(await save()))return;
 if(mode==='account'){const {error}=await client.from(TABLE).delete().eq('id',r.id).eq('user_id',user.id);if(error)return status('Delete failed: '+error.message);studies=studies.filter(x=>x.id!==r.id);}
 else{localStudies=localStudies.filter(x=>x.id!==r.id);studies=localStudies;saveBrowser();}
 activeId=studies[0]?.id||null;editMode=false;updateMode();render();status('Study deleted');
}
async function copyDraft(){
 if(mode!=='account'||!user||!localStudies.length)return;
 const draft=localStudies.find(x=>x.id===$('localSource').value);
 if(!draft)return status('Choose a browser draft first.');
 if(!confirm('Copy "'+(draft.title||'Untitled')+'" to account studies? The browser original stays in place.'))return;
 if(!(await save()))return;
 const payload={user_id:user.id,title:draft.title||'Untitled study',scripture_ref:draft.scripture_ref??draft.reference??'',content_html:sanitize(draft.content_html??draft.content??'')};
 const {data,error}=await client.from(TABLE).insert(payload).select('id,title,scripture_ref,content_html,updated_at').single();
 if(error)return status('Copy failed: '+error.message);
 studies.push(data);activeId=data.id;editMode=false;render();status('Copied to account; browser original preserved');
}
async function loadConfig(){
 try{const resp=await fetch('/.netlify/functions/config',{cache:'no-store'});if(resp.ok){const c=await resp.json();if(c.url&&(c.anonKey||c.key))return{url:c.url,key:c.anonKey||c.key};}}catch{}
 try{const c=JSON.parse(localStorage.getItem('devot_cfg_v2')||'{}');if(c.url&&c.key)return c;}catch{}
 return null;
}
async function setSession(session){
 const next=session?.user||null;
 if(user?.id===next?.id)return;
 if(timer&&!(await save()))return;
 user=next;
 $('authPanel').hidden=!!user;
 $('signedIn').hidden=!user;
 $('userName').textContent=user?.email||'';
 if(user){await refreshAccount();}
 else{mode='browser';studies=localStudies;activeId=studies[0]?.id||null;editMode=false;updateMode();render();}
}
async function initializeAuth(){
 const cfg=await loadConfig();
 if(!cfg||!window.supabase){$('authPanel').hidden=false;status('Account connection unavailable; browser drafts still work.');return;}
 client=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data}=await client.auth.getSession();
 await setSession(data?.session);
 client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>setSession(session),0));
}
async function signIn(){
 if(!client)return status('Account connection unavailable.');
 const email=$('authEmail').value.trim(),password=$('authPassword').value;
 if(!email||!password)return status('Enter email and password.');
 const {error}=await client.auth.signInWithPassword({email,password});
 $('authPassword').value='';
 if(error)status('Sign in failed: '+error.message);
}
function selectedInReader(range){
 if(!range||range.collapsed)return false;
 const root=$('readerContent');
 return root.contains(range.commonAncestorContainer) && !editMode && !$('reader').hidden;
}
function rememberRange(){
 const selection=window.getSelection();if(!selection||!selection.rangeCount)return;
 const range=selection.getRangeAt(0);
 if(selectedInReader(range)){savedRange=range.cloneRange();$('floatingUnderline').hidden=false;}
 else if(!document.activeElement?.closest?.('.floating-underline, #underline'))$('floatingUnderline').hidden=true;
}
function underline(){
 const selection=window.getSelection();
 if(!editMode&&savedRange&&selectedInReader(savedRange)){selection.removeAllRanges();selection.addRange(savedRange);}
 const focused=editMode?$('editor'):$('readerContent');
 if(!selection?.rangeCount||selection.isCollapsed)return status('Select a phrase in the study first.');
 const range=selection.getRangeAt(0);
 if(!focused.contains(range.commonAncestorContainer))return status('Select text inside the study.');
 focused.focus({preventScroll:true});
 const success=document.execCommand('underline',false,null);
 if(!success)return status('Unable to underline that selection. Try a shorter phrase.');
 if(editMode){schedule();}
 else {const r=active();if(r){r.content_html=sanitize($('readerContent').innerHTML);revision++;schedule();}}
 selection.removeAllRanges();savedRange=null;$('floatingUnderline').hidden=true;
}
function init(){
 loadBrowser();studies=localStudies;activeId=studies[0]?.id||null;updateMode();render();
 $('studyChooser').onchange=e=>selectStudy(e.target.value);
 $('previous').onclick=()=>{const i=studies.findIndex(r=>r.id===activeId);if(i>0)selectStudy(studies[i-1].id);};
 $('next').onclick=()=>{const i=studies.findIndex(r=>r.id===activeId);if(i>=0&&i<studies.length-1)selectStudy(studies[i+1].id);};
 $('editToggle').onclick=async()=>{if(!(await save()))return;editMode=!editMode;render();if(editMode)$('title').focus();};
 $('doneEditing').onclick=async()=>{if(!(await save()))return;editMode=false;render();};
 $('title').addEventListener('input',schedule);$('reference').addEventListener('input',schedule);$('editor').addEventListener('input',schedule);
 $('readerContent').addEventListener('input',schedule);
 $('readerContent').addEventListener('beforeinput',event=>{
   if(event.inputType==='formatUnderline'||event.inputType==='historyUndo'||event.inputType==='historyRedo')return;
   event.preventDefault();
 });
 document.addEventListener('selectionchange',rememberRange);
 for(const id of ['underline','floatingUnderline']) {
   $(id).addEventListener('pointerdown',e=>e.preventDefault());
   $(id).onclick=underline;
 }
 $('removeFormat').onclick=()=>{const s=window.getSelection();if(s?.rangeCount&&$('editor').contains(s.getRangeAt(0).commonAncestorContainer)){document.execCommand('removeFormat');schedule();}};
 $('new').onclick=addStudy;$('delete').onclick=deleteStudy;$('download').onclick=download;
 $('modeSwitch').onclick=toggleMode;$('copyLocal').onclick=copyDraft;$('signIn').onclick=signIn;
 $('signOut').onclick=async()=>{if(await save())await client?.auth.signOut();};
 window.addEventListener('beforeunload',()=>{if(mode==='browser'&&active()) {capture();saveBrowser();}});
 initializeAuth();
}
init();
})();