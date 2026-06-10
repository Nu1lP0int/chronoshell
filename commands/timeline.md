---
description: Chronoshell snapshot zaman çizelgesini göster — Claude'un hangi adımda neyi değiştirdiğini listeler.
---

# /timeline

Chronoshell'in aldığı son snapshot'ları, "kaç adım geri" etiketiyle listeler. Hangi araç çağrısının hangi dosyaya dokunduğunu görür, sonra `/rewind <adım>` ile o ana dönersin.

## Yap

Şu komutu çalıştır ve çıktısını kullanıcıya aynen göster:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/timeline.js" $ARGUMENTS
```

İsteğe bağlı sayı argümanı kaç snapshot gösterileceğini belirler (varsayılan 20).
