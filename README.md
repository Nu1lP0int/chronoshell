# Chronoshell

Claude Code için bir geri-alma katmanı. Claude bir dosyaya dokunmadan önce çalışma ağacının sessiz bir kopyasını alır, böylece sonradan tek bir adımı bile geri sarabilirsin. Konuşmayı kaybetmeden, kendi git geçmişini kirletmeden.

## Neden var

Uzun bir oturumda Claude'a iş yaptırırken şöyle bir an gelir: birkaç adım önce bir şeyin bozulduğunu fark edersin ama tam olarak hangi adımda olduğunu bilemezsin. `git diff` sana koca bir yığın değişiklik gösterir, suçluyu içinden ayıklaman gerekir. Geri almak istersen ya hepsini birden alırsın ya da hiçbirini. Tek bir düzenlemeyi seçip geri sarmanın yolu yoktur.

Çoğu kişi bu yüzden Claude'a tam yetki vermekten çekinir. Chronoshell bu çekinceyi ortadan kaldırmak için yazıldı. Claude'un her dosya değiştiren adımı ayrı ayrı kaydedilir, istediğin ana dönersin.

## Nasıl çalışır

Claude bir `Edit`, `Write` veya `Bash` çalıştırmadan hemen önce bir hook devreye girer ve o anki dosya durumunu kaydeder. Bu kayıtlar senin `.git` deponun içine değil, projenin altındaki ayrı bir `.chronoshell/` klasöründe, kendi gölge git deposunda tutulur. Senin commit'lerine, staging alanına, `git status` çıktına dokunulmaz.

Kayıt almak için git'in alt seviye komutları (`commit-tree`, `read-tree`, `update-ref`) kullanılır. Bunlar senin `pre-commit` gibi git hook'larını çalıştırmaz, yani kendi kurulumunu hiçbir şekilde tetiklemez. Değişiklik olmayan adımlar (örneğin salt okuma yapan bir `Bash` komutu) atlanır, geçmiş boş yere şişmez.

## Kurulum

Dört yol var. Hepsi aynı sonuca varır: kurulumdan sonra hook kendiliğinden devreye girer ve `/timeline` ile `/rewind` komutları kullanılabilir hale gelir. Kendi ayar dosyana elle bir şey eklemen gerekmez. Aşağıda her yolun ne yaptığını ve ne zaman tercih edileceğini açıkladım.

### Yol 1: npm ile (terminalden, en kısası)

Terminalden tek komutla kurmak istiyorsan bu yolu kullan. Eklentiyi `~/.claude/skills/chronoshell/` klasörüne kopyalar. Claude Code bu klasörü bir sonraki açılışında otomatik tanır ve `chronoshell@skills-dir` adıyla yükler. Ayrı bir marketplace eklemen ya da kurulum komutu çalıştırman gerekmez.

```bash
npx chronoshell install
```

Sadece içinde bulunduğun projeye kurmak istersen (`./.claude/skills/` altına), şunu kullan:

```bash
npx chronoshell install --project
```

Kurduktan sonra Claude Code'u yeniden başlat ya da çalışan oturumda `/reload-plugins` yaz. Kaldırmak için `npx chronoshell uninstall`.

### Yol 2: git clone ile (terminalden, marketplace olmadan)

npm kullanmak istemiyorsan, depoyu doğrudan Claude'un skills klasörüne klonlayabilirsin. Klasör orada `.claude-plugin/plugin.json` dosyasını içerdiği için Claude Code onu kendiliğinden eklenti olarak yükler.

```bash
git clone https://github.com/<kullanıcı-adın>/chronoshell ~/.claude/skills/chronoshell
```

Depoyu başka bir yere klonladıysan, içine girip `node bin/cli.js install` çalıştırman da aynı işi yapar. Sonrasında yine `/reload-plugins`.

### Yol 3: Claude Code içinden (marketplace)

Terminalle uğraşmadan, doğrudan Claude Code'un içinden kurmak istersen bu yolu kullan. Önce depoyu bir kaynak olarak tanıtırsın, sonra eklentiyi kurarsın, sonra yenilersin.

```
/plugin marketplace add <kullanıcı-adın>/chronoshell
/plugin install chronoshell@chronoshell
/reload-plugins
```

İlk satır depodaki katalog dosyasını okur ve eklentiyi seçilebilir hale getirir. İkinci satır onu kurar. Üçüncü satır da yeniden başlatmadan aktif eder.

### Yol 4: Terminal CLI ile marketplace üzerinden (otomasyona uygun)

Kurulumu bir script'e koymak ya da ekip ayarına bağlamak istiyorsan, marketplace'i ayar dosyasına yazıp `claude` komut satırından kurabilirsin. Önce `~/.claude/settings.json` (ya da projedeki `.claude/settings.json`) dosyasına kaynağı ekle:

```json
{
  "extraKnownMarketplaces": {
    "chronoshell": {
      "source": { "source": "github", "repo": "<kullanıcı-adın>/chronoshell" }
    }
  }
}
```

Sonra terminalden kur:

```bash
claude plugin install chronoshell@chronoshell --scope user
```

`--scope user` tüm projelerin için kurar. `--scope project` ise sadece bu depo için kurar ve `.claude/settings.json` üzerinden ekibinle paylaşılır.

### Kurmadan önce denemek

Hiç kurmadan, sadece bir oturum boyunca denemek istersen:

```bash
git clone https://github.com/<kullanıcı-adın>/chronoshell
claude --plugin-dir ./chronoshell
```

Bu, eklentiyi yalnızca o oturum için yükler, kalıcı bir kuruluma dokunmaz.

## Kullanım

Kurduktan sonra arka planda kendiliğinden çalışır, sen normal şekilde Claude ile çalışmaya devam edersin. Bir şeyleri geri sarmak istediğinde üç komutun var.

`/timeline` son alınan kayıtları listeler. Her satırın yanında kaç adım geri olduğu, hangi aracın tetiklediği ve hangi dosyaya dokunulduğu yazar. Önce buraya bakıp nereye dönmek istediğine karar verirsin.

`/rewind` bir adım geri sarar, yani son değişikliği geri alır. Daha geriye gitmek istersen sayı verirsin: `/rewind 3` üç adım öncesine döner. Geri sarma sırasında çalışma ağacın o ana döner ama konuşma olduğu gibi kalır, anlattıklarını kaybetmezsin.

`/rewind --diff` son iki kayıt arasında tam olarak neyin değiştiğini gösterir. Geri sarmadan önce hangi adımın neyi bozduğunu görmek istersen önce bunu çalıştır.

Geri sarma işleminin kendisi de kaydedilir. Yani yanlış ana döndüysen bir kez daha `/rewind` ile ileri gelebilirsin.

## Ne yapar, ne yapmaz

Senin git deponu değiştirmez. Snapshot'lar ayrı bir gölge depoda durur, commit'lerin ve `git status` çıktın olduğu gibi kalır. Bunu testlerle doğruladım.

`.chronoshell/` klasörü senin `git status`'ünde görünmez. Kurulumda `.git/info/exclude` dosyasına yerel olarak eklenir, bu da takip edilen hiçbir dosyayı değiştirmeden onu gizler.

Hassas dosyalar kayda girmez. `.env`, `*.pem`, `*.key`, `id_rsa`, `.netrc` gibi dosyalar ve senin kendi `.gitignore` kuralların gölge depoya aktarılır, böylece sırların `.chronoshell/` içine sızmaz. `node_modules`, `.venv`, `dist` gibi ağır klasörler de dışarıda bırakılır.

Hook hata verse bile akışını durdurmaz. Her durumda sıfır koduyla çıkar, yani bir terslik olsa bile Claude'un işini bloklamaz.

Hiçbir veri cihazından çıkmaz. Her şey yerel git nesneleri olarak durur, ağ trafiği yoktur.

## Gereksinimler

`node` ve `git` komutlarının `PATH` üzerinde olması gerekir. Hook ayrı bir `node` süreci başlatır, snapshot motoru da git'i kullanır. İkisinden biri yoksa hook sessizce atlar ve senin işini bozmaz, ama geri sarma da çalışmaz. Çoğu geliştiricide ikisi de zaten kuruludur.

Büyük bir depoda ilk snapshot biraz uzun sürebilir, çünkü ilk taramada bütün dosyalar okunur. Sonraki snapshot'lar kalıcı bir index sayesinde yalnızca değişeni işler ve hızlıdır. Hook'un 30 saniyelik bir zaman sınırı vardır.

Windows, macOS ve Linux'ta çalışır. Hook, `node`'u doğrudan çağıracak biçimde tanımlı olduğu için kabuk farklarına takılmaz.

## Kaldırma

npm ile kurduysan `npx chronoshell uninstall`, projeye kurduysan `node bin/cli.js uninstall --project`. Marketplace üzerinden kurduysan `/plugin uninstall chronoshell@chronoshell`. Doğrudan klonladıysan `~/.claude/skills/chronoshell` klasörünü silmen yeterli. Hepsinden sonra `/reload-plugins` ile değişikliği uygula.

## Geliştirme ve test

Motorun davranışı `node --test` ile sınanır: geri alma ve ileri sarma, değişiklik olmayan adımın atlanması, kullanıcı git'ine dokunulmaması, sır dosyalarının kayda girmemesi ve sınır durumları.

```bash
npm test
```

Kod CommonJS olarak yazıldı, harici bağımlılığı yok. `scripts/lib.js` snapshot ve geri sarma motorunu, `scripts/snapshot.js` hook girişini, `bin/cli.js` ise terminal kurucusunu barındırır.

## Lisans

MIT.
