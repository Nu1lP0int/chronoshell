'use strict';
// PreToolUse hook girişi. stdin'den hook JSON'u okur, çalışma ağacını snapshot'lar.
// ASLA blokla, ASLA hata fırlat — her durumda exit 0 (kullanıcının akışını bozma).

const lib = require('./lib');
const fs = require('fs');
const path = require('path');

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function validRoot(root) {
  try {
    return typeof root === 'string' && path.isAbsolute(root) &&
      fs.existsSync(root) && fs.statSync(root).isDirectory();
  } catch { return false; }
}

(function main() {
  let data = {};
  try { data = JSON.parse(readStdin() || '{}'); } catch { /* boş geç */ }

  const tool = data.tool_name || data.tool || '?';
  const input = data.tool_input || data.toolInput || {};
  const file = input.file_path || input.path || input.notebook_path || '';
  const root = data.cwd || process.cwd();
  if (!validRoot(root)) process.exit(0); // güvensiz/geçersiz dizin — sessizce çık

  try {
    lib.snapshot(root, { tool, file });
  } catch (e) {
    // sessizce yut; gerekirse stderr'e [chronoshell] ile logla
    try { process.stderr.write(`[chronoshell] snapshot atlandı: ${e.message}\n`); } catch { /* */ }
  }
  process.exit(0);
})();
