const fs = require('fs');

const config = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
};

fs.writeFileSync(
  'env.js',
  `window.DEVOT_SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  'utf8'
);
