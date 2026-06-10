---
description: Çalışma ağacını N araç-adımı öncesine geri sar (Chronoshell). Sohbet bağlamı korunur. /rewind 3 ya da /rewind --diff.
---

# /rewind

Chronoshell ile çalışma ağacını, Claude'un attığı bir önceki dosya-değiştiren adıma (veya N adım öncesine) geri sar. Konuşma bağlamın kaybolmaz; sadece dosyalar geri döner. Geri sarma işlemi de kaydedilir, yani geri-alınabilir.

## Yap

`$ARGUMENTS` argümanlarıyla şu komutu çalıştır ve çıktısını kullanıcıya aynen göster:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/rewind.js" $ARGUMENTS
```

- Argüman yoksa: bir adım geri sarar (en son snapshot).
- Sayı verilirse (`/rewind 3`): o kadar adım geri sarar.
- `/rewind --diff`: son iki snapshot arasındaki farkı gösterir (hangi adım neyi değiştirdi).

Geri sarmadan önce mevcut hangi dosyaların değişeceğini kullanıcı merak ederse, önce `/rewind --diff` çalıştırmasını öner.
