'use strict';
// /timeline CLI — son snapshot'ları okunur bir zaman çizelgesi olarak listeler.
const lib = require('./lib');
const root = process.cwd();
const limit = parseInt(process.argv[2] || '20', 10);

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}sn`;
  if (s < 3600) return `${Math.round(s / 60)}dk`;
  return `${Math.round(s / 3600)}sa`;
}

const entries = lib.list(root);
if (!entries.length) { console.log('Chronoshell: henüz snapshot yok.'); process.exit(0); }

const shown = entries.slice(-limit);
console.log(`⏱  Chronoshell zaman çizelgesi (son ${shown.length}/${entries.length} snapshot)\n`);
shown.reverse().forEach((e, i) => {
  const back = i + 1; // en üstteki = 1 adım geri
  const f = e.file ? e.file.replace(root + '/', '') : '';
  console.log(`  ${String(back).padStart(3)}↩  #${e.seq}  ${ago(e.ts).padStart(4)} önce  ${e.tool}${f ? '  ' + f : ''}`);
});
console.log(`\n  Geri sarmak için:  /rewind <adım>   ·  farkı görmek için:  /rewind --diff`);
