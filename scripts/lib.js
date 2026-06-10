'use strict';
// chronoshell/lib.js — gölge git motoru.
// Tüm snapshot'lar AYRI bir git deposunda (.chronoshell/shadow.git) ve AYRI bir
// index dosyasında tutulur. Kullanıcının kendi .git'i, çalışma ağacı ve commit'leri
// ASLA değiştirilmez. Hiçbir yerde "düz git" çağrılmaz; her çağrı izole edilir.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HEAVY_EXCLUDES = [
  '.chronoshell/', '.git/', 'node_modules/', '.venv/', 'venv/', '__pycache__/',
  'dist/', 'build/', 'out/', 'target/', '.next/', '.nuxt/', '.cache/',
  'coverage/', '*.log', '.DS_Store', 'vendor/', '.gradle/', '.idea/',
];
const MAX_SNAPSHOTS = parseInt(process.env.CHRONOSHELL_MAX || '120', 10);

function paths(root) {
  const base = path.join(root, '.chronoshell');
  return {
    base,
    gitDir: path.join(base, 'shadow.git'),
    index: path.join(base, 'index'),
    manifest: path.join(base, 'log.jsonl'),
    state: path.join(base, 'state.json'),
  };
}

function git(root, args, { capture = true } = {}) {
  const p = paths(root);
  const env = {
    ...process.env,
    GIT_DIR: p.gitDir,
    GIT_WORK_TREE: root,
    GIT_INDEX_FILE: p.index,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'chronoshell', GIT_AUTHOR_EMAIL: 'chrono@local',
    GIT_COMMITTER_NAME: 'chronoshell', GIT_COMMITTER_EMAIL: 'chrono@local',
  };
  // core.bare=false + worktree env, snapshot çağrılarında çakışmayı önler.
  const full = ['-c', 'core.bare=false', '-c', 'gc.auto=0', ...args];
  return execFileSync('git', full, { env, encoding: capture ? 'utf8' : undefined, stdio: capture ? ['ignore', 'pipe', 'ignore'] : 'ignore' });
}

function readState(root) {
  const p = paths(root);
  try { return JSON.parse(fs.readFileSync(p.state, 'utf8')); }
  catch { return { seq: 0, lastTree: null }; }
}
function writeState(root, s) { fs.writeFileSync(paths(root).state, JSON.stringify(s)); }

function isInit(root) { return fs.existsSync(paths(root).gitDir); }

function ensureInit(root) {
  const p = paths(root);
  if (isInit(root)) return;
  fs.mkdirSync(p.base, { recursive: true });
  git(root, ['init', '--quiet']);
  // gölge deponun kendi exclude'u: ağır dizinleri snapshot dışı tut (gitignore'suz projeler için)
  const info = path.join(p.gitDir, 'info');
  fs.mkdirSync(info, { recursive: true });
  fs.writeFileSync(path.join(info, 'exclude'), HEAVY_EXCLUDES.join('\n') + '\n');
  // kullanıcının .git'i varsa .chronoshell'i YEREL olarak gizle (tracked dosya değiştirmeden)
  const userExclude = path.join(root, '.git', 'info', 'exclude');
  try {
    if (fs.existsSync(path.dirname(userExclude))) {
      const cur = fs.existsSync(userExclude) ? fs.readFileSync(userExclude, 'utf8') : '';
      if (!cur.includes('.chronoshell')) fs.appendFileSync(userExclude, '\n.chronoshell/\n');
    }
  } catch { /* sessiz */ }
}

/** Çalışma ağacının şu anki halini gölge depoya snapshot'lar. Değişiklik yoksa atlar. */
function snapshot(root, meta = {}) {
  ensureInit(root);
  const p = paths(root);
  git(root, ['add', '-A']);
  const tree = git(root, ['write-tree']).trim();
  const st = readState(root);
  if (tree === st.lastTree) return { skipped: true, seq: st.seq };

  const seq = st.seq + 1;
  const payload = JSON.stringify({ seq, tool: meta.tool || '?', file: meta.file || '', ts: Date.now() });
  const commit = git(root, ['commit-tree', tree, '-m', payload]).trim();
  git(root, ['update-ref', `refs/chronoshell/s/${seq}`, commit]);

  fs.appendFileSync(p.manifest, JSON.stringify({ seq, commit, tool: meta.tool || '?', file: meta.file || '', ts: Date.now() }) + '\n');
  writeState(root, { seq, lastTree: tree });
  prune(root, seq);
  return { skipped: false, seq, commit };
}

/** Eski snapshot ref'lerini siler (disk sınırı). Manifest'i de kırpar. */
function prune(root, seq) {
  const p = paths(root);
  const cutoff = seq - MAX_SNAPSHOTS;
  if (cutoff < 1) return;
  for (let s = cutoff; s >= cutoff - 5 && s >= 1; s--) {
    try { git(root, ['update-ref', '-d', `refs/chronoshell/s/${s}`]); } catch { /* yok */ }
  }
  // manifest'i son MAX_SNAPSHOTS ile sınırla
  try {
    const lines = fs.readFileSync(p.manifest, 'utf8').trim().split('\n');
    if (lines.length > MAX_SNAPSHOTS) {
      fs.writeFileSync(p.manifest, lines.slice(-MAX_SNAPSHOTS).join('\n') + '\n');
    }
  } catch { /* yok */ }
}

/** Manifest'ten snapshot listesi (eski->yeni). */
function list(root) {
  try {
    return fs.readFileSync(paths(root).manifest, 'utf8').trim().split('\n')
      .filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

/** "n snapshot önce"yi commit'e çevirir. n=1 => en son snapshot. */
function resolveBack(root, n) {
  const entries = list(root);
  if (!entries.length) return null;
  const idx = entries.length - n;
  if (idx < 0 || idx >= entries.length) return null;
  return entries[idx];
}

/** Çalışma ağacını hedef snapshot'a geri sarar. Önce güvenlik snapshot'ı alır (geri-alınabilir). */
function rewind(root, n) {
  if (!isInit(root)) throw new Error('Henüz snapshot yok.');
  const target = resolveBack(root, n);
  if (!target) throw new Error(`Geçersiz adım: ${n} (toplam ${list(root).length} snapshot var).`);
  // geri sarmadan önce mevcut hali kaydet -> /rewind geri alınabilir olsun
  snapshot(root, { tool: 'pre-rewind', file: '(otomatik güvenlik)' });
  // tracked dosyaları hedefe eşitle (eklenenleri siler, değişenleri/silinenleri geri yükler)
  git(root, ['read-tree', '-u', '--reset', target.commit]);
  writeState(root, { ...readState(root), lastTree: git(root, ['write-tree']).trim() });
  return target;
}

/** İki snapshot arası fark (varsayılan: son iki). */
function diff(root, aSeq, bSeq) {
  const entries = list(root);
  if (entries.length < 1) return '';
  let a, b;
  if (aSeq && bSeq) { a = `refs/chronoshell/s/${aSeq}`; b = `refs/chronoshell/s/${bSeq}`; }
  else if (entries.length >= 2) { a = entries[entries.length - 2].commit; b = entries[entries.length - 1].commit; }
  else { a = entries[entries.length - 1].commit + '^{tree}'; b = entries[entries.length - 1].commit; return ''; }
  try { return git(root, ['--no-pager', 'diff', a, b]); } catch { return ''; }
}

module.exports = { paths, ensureInit, isInit, snapshot, list, resolveBack, rewind, diff, prune, MAX_SNAPSHOTS };
