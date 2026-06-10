#!/usr/bin/env node
'use strict';
// chronoshell CLI kurucu — terminal/npm yolu.
// Eklentiyi ~/.claude/skills/chronoshell/ altına kopyalar; Claude Code onu bir sonraki
// oturumda "chronoshell@skills-dir" olarak OTOMATİK yükler (marketplace/install adımı YOK,
// hook'lar dahil). Kaynak: code.claude.com/docs/en/plugins-reference#skills-directory-plugins
//
// Kullanım:
//   npx chronoshell install        (yayınlandıktan sonra)
//   node bin/cli.js install        (repo klonundan)
//   node bin/cli.js install --project   (kişisel yerine projeye kur)
//   node bin/cli.js uninstall

const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname, '..');                  // paket/repo kökü
const NAME = 'chronoshell';
const COPY = ['.claude-plugin', 'hooks', 'commands', 'scripts', 'plugin.json', 'README.md', 'LICENSE'];

function targetDir(scope) {
  const base = scope === 'project'
    ? path.join(process.cwd(), '.claude', 'skills')
    : path.join(os.homedir(), '.claude', 'skills');
  return path.join(base, NAME);
}

function install(scope) {
  const dest = targetDir(scope);
  fs.mkdirSync(dest, { recursive: true });
  for (const item of COPY) {
    const from = path.join(SRC, item);
    if (!fs.existsSync(from)) continue;
    fs.cpSync(from, path.join(dest, item), { recursive: true });
  }
  console.log(`✅ Chronoshell kuruldu: ${dest}`);
  console.log(`   Claude Code'u yeniden başlat ya da /reload-plugins çalıştır.`);
  console.log(`   Aktifleşince: /timeline ve /rewind komutları + otomatik snapshot hook'u.`);
  console.log(`   (Kaldırmak için: ${scope === 'project' ? 'node bin/cli.js uninstall --project' : 'npx chronoshell uninstall'})`);
}

function uninstall(scope) {
  const dest = targetDir(scope);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
    console.log(`🗑  Chronoshell kaldırıldı: ${dest}`);
    console.log(`   /reload-plugins ile değişikliği uygula.`);
  } else {
    console.log(`· Kurulu değil: ${dest}`);
  }
}

const cmd = process.argv[2];
const scope = process.argv.includes('--project') ? 'project' : 'user';

if (cmd === 'install') install(scope);
else if (cmd === 'uninstall') uninstall(scope);
else {
  console.log('Chronoshell CLI');
  console.log('  install [--project]    ~/.claude/skills/ (veya ./.claude/skills/) altına kur');
  console.log('  uninstall [--project]  kaldır');
  process.exit(cmd ? 1 : 0);
}
