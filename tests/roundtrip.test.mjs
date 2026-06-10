import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const lib = require('../scripts/lib.js');

function tmpRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chrono-'));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'user.email', 't@t'], {});
  execFileSync('git', ['-C', root, 'config', 'user.name', 't'], {});
  return root;
}
const write = (root, f, c) => fs.writeFileSync(path.join(root, f), c);
const read = (root, f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (root, f) => fs.existsSync(path.join(root, f));

test('snapshot + rewind: dosya içeriğini geri yükler (undo)', () => {
  const root = tmpRepo();
  write(root, 'a.txt', 'AAAA');
  execFileSync('git', ['-C', root, 'add', '-A']);
  execFileSync('git', ['-C', root, 'commit', '-qm', 'init']);

  lib.snapshot(root, { tool: 's1' });           // s1 = AAAA
  write(root, 'a.txt', 'BBBB'); lib.snapshot(root, { tool: 's2' }); // s2 = BBBB
  write(root, 'a.txt', 'CCCC'); lib.snapshot(root, { tool: 's3' }); // s3 = CCCC
  write(root, 'a.txt', 'DDDD'); write(root, 'b.txt', 'NEW');        // bekleyen değişiklik (snap yok)

  assert.equal(read(root, 'a.txt'), 'DDDD');
  assert.ok(exists(root, 'b.txt'));

  const before = lib.list(root).length;
  lib.rewind(root, 1);                            // s3'e dön
  assert.equal(read(root, 'a.txt'), 'CCCC', 'a.txt CCCC olmalı');
  assert.equal(exists(root, 'b.txt'), false, 'b.txt silinmeli (s3te yoktu)');
  assert.equal(lib.list(root).length, before + 1, 'güvenlik snapshot eklenmeli');
});

test('birden çok adım geri + ileri (redo) sarılabilir', () => {
  const root = tmpRepo();
  write(root, 'a.txt', 'V1'); lib.snapshot(root, { tool: '1' });
  write(root, 'a.txt', 'V2'); lib.snapshot(root, { tool: '2' });
  write(root, 'a.txt', 'V3'); lib.snapshot(root, { tool: '3' });
  write(root, 'a.txt', 'V4'); // bekleyen

  lib.rewind(root, 2);                 // V2'ye (s2)
  assert.equal(read(root, 'a.txt'), 'V2');
  // güvenlik snapshot'ı V4'ü kaydetti -> ileri sar
  lib.rewind(root, 1);
  assert.equal(read(root, 'a.txt'), 'V4', 'redo ile V4 geri gelmeli');
});

test('değişiklik yoksa snapshot atlanır (dedupe)', () => {
  const root = tmpRepo();
  write(root, 'a.txt', 'X');
  const r1 = lib.snapshot(root, { tool: 'a' });
  const r2 = lib.snapshot(root, { tool: 'b' }); // aynı ağaç
  assert.equal(r1.skipped, false);
  assert.equal(r2.skipped, true);
});

test('kullanıcının kendi git deposu ASLA değişmez', () => {
  const root = tmpRepo();
  write(root, 'a.txt', 'orijinal');
  execFileSync('git', ['-C', root, 'add', '-A']);
  execFileSync('git', ['-C', root, 'commit', '-qm', 'tek commit']);
  const headBefore = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const countBefore = execFileSync('git', ['-C', root, 'rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim();

  // bir sürü chronoshell aktivitesi
  for (let i = 0; i < 5; i++) { write(root, 'a.txt', 'sürüm' + i); lib.snapshot(root, { tool: 't' + i }); }
  lib.rewind(root, 2);

  const headAfter = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const countAfter = execFileSync('git', ['-C', root, 'rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(headAfter, headBefore, 'kullanıcının HEAD commit\'i değişmemeli');
  assert.equal(countAfter, countBefore, 'commit sayısı değişmemeli');
});

test('.chronoshell oluşturulur ve kullanıcı git\'inde yerel olarak gizlenir', () => {
  const root = tmpRepo();
  write(root, 'a.txt', '1'); lib.snapshot(root, { tool: 's' });
  assert.ok(exists(root, '.chronoshell/shadow.git'), 'gölge depo olmalı');
  const excl = read(root, '.git/info/exclude');
  assert.ok(excl.includes('.chronoshell'), '.chronoshell git exclude\'a eklenmeli');
  // kullanıcının git status'ünde .chronoshell GÖRÜNMEMELİ
  const status = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.ok(!status.includes('.chronoshell'), '.chronoshell git status\'te görünmemeli');
});
