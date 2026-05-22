const fs = require('fs');

const config = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
};

const htmlPath = 'index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const next = html.replace(
  'window.DEVOT_SUPABASE_CONFIG = {};',
  `window.DEVOT_SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};`
);

if (next === html) {
  throw new Error('Could not find config placeholder in index.html');
}

fs.writeFileSync(htmlPath, next, 'utf8');
fs.writeFileSync('env.js', `window.DEVOT_SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`, 'utf8');
