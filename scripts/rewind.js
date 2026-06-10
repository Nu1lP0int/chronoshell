'use strict';
// /rewind CLI — çalışma ağacını N snapshot öncesine geri sarar veya farkı gösterir.
// Kullanım:
//   node rewind.js            -> 1 adım geri (en son snapshot'a)
//   node rewind.js 3          -> 3 adım geri
//   node rewind.js --diff     -> son iki snapshot arası fark
//   node rewind.js --diff A B -> A ve B snapshot'ları arası fark

const lib = require('./lib');
const root = process.cwd();
const args = process.argv.slice(2);

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s} sn önce`;
  if (s < 3600) return `${Math.round(s / 60)} dk önce`;
  return `${Math.round(s / 3600)} sa önce`;
}

try {
  if (!lib.isInit(root)) { console.log('Chronoshell: bu projede henüz snapshot yok.'); process.exit(0); }

  if (args[0] === '--diff') {
    const out = lib.diff(root, args[1], args[2]);
    console.log(out.trim() ? out : 'Fark yok ya da karşılaştırılacak iki snapshot yok.');
    process.exit(0);
  }

  const n = Math.max(1, parseInt(args[0] || '1', 10) || 1);
  const total = lib.list(root).length;
  const target = lib.rewind(root, n);
  console.log(`⏪ Geri sarıldı: ${n} adım önceki snapshot (#${target.seq}, ${ago(target.ts)}).`);
  console.log(`   Tetikleyen: ${target.tool}${target.file ? ' · ' + target.file : ''}`);
  console.log(`   Çalışma ağacın o ana döndü. Bu işlem de kaydedildi — istersen ileri sarmak için /rewind 1 ile geri alabilirsin.`);
  console.log(`   (toplam ${total} snapshot vardı)`);
} catch (e) {
  console.log(`Chronoshell hata: ${e.message}`);
}
