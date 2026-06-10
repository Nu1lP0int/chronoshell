# ⏪ Chronoshell

**Claude Code için araç-çağrısı seviyesinde zaman makinesi.** Claude'un attığı her dosya-değiştiren adımdan _önce_ sessiz bir snapshot alır. Bir şeyler ters gittiğinde tek bir adımı bile saniyede geri sararsın — hem de **konuşma bağlamını kaybetmeden**.

> Claude'a tam otonomi vermekten korkma. Geri sarman var.

---

## Çözdüğü gerçek dert

Uzun bir oturumda Claude 8 adım önce bir şeyi sessizce bozar. Fark ettiğinde `git diff` sana tek bir devasa fark gösterir — hangi adımın suçlu olduğunu ayıklayamazsın. "Undo" yoktur: ya hepsini geri alırsın ya hiçbirini. Çoğu insan bu yüzden Claude'a tam yetki vermekten çekinir.

Chronoshell bu boşluğu kapatır: **agent'ın araç-çağrısı granülaritesinde** geçmiş tutar. Editör Ctrl+Z'si insan tuşuna basışını, git ise insan commit'ini geri alır; Chronoshell ise _Claude'un her adımını_ geri alır.

## Nasıl çalışır

- Bir **`PreToolUse` hook** (`Edit`/`Write`/`MultiEdit`/`NotebookEdit`/`Bash`) her değişiklikten önce çalışma ağacının anlık bir kopyasını alır.
- Snapshot'lar **ayrı bir gölge git deposunda** (`.chronoshell/shadow.git`) ve **ayrı bir index'te** tutulur. Senin `.git`'ine, commit'lerine veya staging alanına **asla** dokunulmaz.
- Değişiklik yoksa snapshot atlanır (salt-okunur `Bash` komutları geçmişi şişirmez).
- Eski snapshot'lar otomatik budanır (varsayılan son 120, `CHRONOSHELL_MAX` ile ayarlanır).

## Komutlar

| Komut | Ne yapar |
|-------|----------|
| `/timeline` | Son snapshot'ları "kaç adım geri" etiketiyle listeler |
| `/rewind` | Bir adım geri sarar (son değişikliği geri alır) |
| `/rewind 3` | 3 araç-adımı öncesine döner |
| `/rewind --diff` | Son iki snapshot arasında tam olarak neyin değiştiğini gösterir |

Geri sarma işlemi de kaydedilir — yani **geri sarmayı da geri alabilirsin** (redo). Yanlış adıma dönersen `/rewind 1` ile geri gelirsin.

## Güvenlik garantileri

- ✅ Kendi git deponu **değiştirmez** (ayrı `GIT_DIR` + ayrı index). Testlerle kanıtlı.
- ✅ `.chronoshell/` senin `git status`'ünde **görünmez** (`.git/info/exclude`'a yerel eklenir, tracked dosya değiştirmeden).
- ✅ **Sırlar korunur:** `.env`, `*.pem`, `*.key`, `id_rsa`, `.netrc` gibi hassas dosyalar ve senin `.gitignore` desenlerin snapshot'a **hiç girmez** (kurulumda gölge depoya aktarılır). Sırların `.chronoshell`'e sızmaz.
- ✅ `node_modules`, `.venv`, `dist` gibi ağır dizinler otomatik dışlanır; eski snapshot object'leri periyodik olarak diskten temizlenir.
- ✅ Hook hata verirse **akışını bloklamaz** — her durumda `exit 0`.
- ✅ Hiçbir veri cihazdan çıkmaz; saf yerel git nesneleri.

## Kurulum

Dört yol var; hangisi sana uygunsa. Kurulumdan sonra hook **otomatik** devreye girer (kendi `settings.json`'una elle bir şey eklemen gerekmez) ve `/timeline` + `/rewind` komutları kullanılabilir hale gelir.

### 1) npm / npx ile (terminal — en kolay)

```bash
npx chronoshell install          # ~/.claude/skills/ altına kurar (tüm projeler)
npx chronoshell install --project   # sadece bu projeye (./.claude/skills/)
# kaldırma:
npx chronoshell uninstall
```

Bu, eklentiyi `~/.claude/skills/chronoshell/` altına koyar; Claude Code onu bir sonraki oturumda **`chronoshell@skills-dir`** olarak otomatik yükler — marketplace/install adımı gerekmez, hook'lar dahil. Sonra `/reload-plugins`.

### 2) git clone tek satır (terminal — marketplace'siz)

```bash
git clone https://github.com/<github-kullanıcı>/chronoshell ~/.claude/skills/chronoshell
```

Klasör `~/.claude/skills/` altında `.claude-plugin/plugin.json` içerdiği için otomatik `@skills-dir` plugin olarak yüklenir. (Repo klonundan `node bin/cli.js install` de aynısını yapar.)

### 3) Claude Code marketplace (uygulama içi)

```
/plugin marketplace add <github-kullanıcı>/chronoshell
/plugin install chronoshell@chronoshell
/reload-plugins
```

### 4) Terminal CLI + marketplace (script'leştirilebilir)

Önce marketplace'i `~/.claude/settings.json`'a tanıt:

```json
{ "extraKnownMarketplaces": { "chronoshell": { "source": { "source": "github", "repo": "<github-kullanıcı>/chronoshell" } } } }
```

Sonra terminalden kur:

```bash
claude plugin install chronoshell@chronoshell --scope user
```

### Önce denemek (hiç kurmadan)

```bash
git clone https://github.com/<github-kullanıcı>/chronoshell
claude --plugin-dir ./chronoshell
```

## Gereksinimler

- **Claude Code** (plugin + hook destekli güncel sürüm)
- **`node` PATH'te** — hook `node` ile çalışır. (Claude Code zaten node ile gelir ama hook ayrı bir `node` süreci başlatır; PATH'te olmalı.)
- **`git` PATH'te** — snapshot motoru git plumbing kullanır. git yoksa hook sessizce atlar, akışını bozmaz.

## Taşınabilirlik (dürüst notlar)

- ✅ **Windows/macOS/Linux:** Hook *exec form* (`command: "node", args: [...]`) ile tanımlı; `node.exe` gerçek binary olduğu için her platformda çalışır, shell farkına takılmaz.
- ✅ **Kendi git hook'ların tetiklenmez:** snapshot için `commit-tree`/`read-tree`/`update-ref` plumbing'i kullanılır; bunlar `pre-commit` vb. çalıştırmaz.
- ⚠️ **İlk snapshot büyük repoda biraz sürebilir** (ilk `git add -A`). Sonraki snapshot'lar kalıcı index sayesinde artımlı ve hızlıdır. Hook 30 sn timeout'ludur.
- ⚠️ **git/node PATH'te değilse** hook çalışmaz (sessizce atlar) — geri sarma için ikisi de gerekir.

## Test

```bash
npm test    # node --test, gölge-git roundtrip + güvenlik garantileri
```

## Lisans

MIT — özgürce kullan, çatalla, geliştir.
