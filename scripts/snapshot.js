'use strict';
// PreToolUse hook girişi. stdin'den hook JSON'u okur, çalışma ağacını snapshot'lar.
// ASLA blokla, ASLA hata fırlat — her durumda exit 0 (kullanıcının akışını bozma).

const lib = require('./lib');

function readStdin() {
  try { return require('fs').readFileSync(0, 'utf8'); } catch { return ''; }
}

(function main() {
  let data = {};
  try { data = JSON.parse(readStdin() || '{}'); } catch { /* boş geç */ }

  const tool = data.tool_name || data.tool || '?';
  const input = data.tool_input || data.toolInput || {};
  const file = input.file_path || input.path || input.notebook_path || '';
  const root = data.cwd || process.cwd();

  try {
    lib.snapshot(root, { tool, file });
  } catch (e) {
    // sessizce yut; gerekirse stderr'e [chronoshell] ile logla
    try { process.stderr.write(`[chronoshell] snapshot atlandı: ${e.message}\n`); } catch { /* */ }
  }
  process.exit(0);
})();
