# Kalite short sepeti modeli (B, g72x)

2026-10-11 · `python3 tests/kalite-model.py`

Örnek 761,072 (veto dışı, g72 tanımlı), eğitim puan ≥ 0,15, 240 ağaç (lr 0,03, 15 yaprak, en az 400 örnek, alt örnek 0,7, λ 50). Değerlendirme masanın girdiği kararlarda, örneklem dışı 2022-01 →. g72: % işlem başı, 72 sa kapanıştan kapanışa.

| yön | karar | g72 tümü | en kötü %30 atılınca | atılanlar | fark |
|---|---:|---:|---:|---:|---:|
| hepsi | 98,621 | +0.155 | +0.313 (%70) | -0.208 | +0.158 |
| short | 57,308 | +0.206 | +0.492 (%67) | -0.368 | +0.286 |
| long | 41,313 | +0.085 | +0.089 (%74) | +0.075 | +0.004 |

Short, yıl yıl fark (kalan − tümü): 2022 -0.149 · 2023 +0.724 · 2024 +0.597 · 2025 +0.170 · 2026 +0.391

Son 90 günün örneklem dışı tahminlerinden eşik: %30 → 0.0991, %50 → 0.1734 (4926 karar). Canlıda başlangıç değeri; 90 günlük canlı tahmin birikince onunla güncellenir.

Son modelde en çok kazanç: vol30 13%, s200 11%, bs200 10%, s50 10%, bs50 9%, r30d 9%, s20 8%, fr 6%, r7d 5%, L 5%, pos24 2%, v_check 2%

Model dosyası src/kshort-data.js 134 KB, aşamalar: afterTouch, done, entry, expired, failed, noBias, noSweep, stopped, waitEntry, waitMSS.
