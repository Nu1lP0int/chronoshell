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

Claude Code plugin marketplace üzerinden:

```
/plugin marketplace add <kullanıcı>/chronoshell
/plugin install chronoshell@chronoshell
```

Ya da elle: bu repoyu klonla, `~/.claude/plugins/` altına koy veya hook'u `hooks/hooks.json`'daki gibi `settings.json`'a ekle.

## Gereksinimler

- Claude Code (hook + plugin desteği)
- `git` ve `node >= 18` (PATH'te)

## Test

```bash
npm test    # node --test, gölge-git roundtrip + güvenlik garantileri
```

## Lisans

MIT — özgürce kullan, çatalla, geliştir.
