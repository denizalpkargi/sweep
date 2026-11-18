# Test #96: Ozan sırasına bant + kısmi geçiş

Ozan örneklem dışı sırası (4 ve 12 sa modellerinin ortalaması), ilk 30, saatlik, 2024-06-01 → 2026-10-07. Getiri VWAP → VWAP (basit), gerçek fonlama, devir başına %0,08. Ağırlık pozisyon başına 1/K (K ≈ evrenin %10'u). Günlük getiri toplamları; t günlük.

| Bacak | Kural | günlük % | t | 1. yarı % | 2. yarı % | son 12 ay % | yıllık % | düşüş % | ort. brüt | saatlik devir | maliyet / brüt kâr |
|---|---|---|---|---|---|---|---|---|---|---|---|
| short | tam | -0,593 | -2,4 | -0,917 | -0,268 | -0,128 | -96 | -100 | 0,90 | 0,721 | 1,75 |
| short | bant | +0,045 | +0,1 | -0,186 | +0,277 | +0,516 | -87 | -100 | 1,61 | 0,377 | 0,94 |
| short | kısmi λ 0,05 | +0,100 | +0,5 | +0,102 | +0,097 | +0,150 | -21 | -75 | 0,89 | 0,057 | 0,52 |
| short | kısmi λ 0,1 | +0,103 | +0,5 | +0,048 | +0,159 | +0,226 | -27 | -81 | 0,89 | 0,104 | 0,66 |
| short | kısmi λ 0,2 | +0,056 | +0,3 | -0,078 | +0,189 | +0,277 | -45 | -90 | 0,90 | 0,189 | 0,87 |
| long | tam | -1,264 | -9,3 | -1,224 | -1,301 | -1,409 | -99 | -100 | 1,00 | 0,799 | 5,68 |
| long | bant | -0,470 | -2,3 | -0,384 | -0,555 | -0,694 | -91 | -100 | 1,65 | 0,425 | 2,36 |
| long | kısmi λ 0,05 | -0,049 | -0,4 | +0,061 | -0,158 | -0,221 | -32 | -73 | 0,99 | 0,059 | 1,74 |
| long | kısmi λ 0,1 | -0,111 | -0,9 | -0,007 | -0,214 | -0,286 | -46 | -82 | 1,00 | 0,110 | 2,11 |
| long | kısmi λ 0,2 | -0,247 | -2,0 | -0,153 | -0,340 | -0,423 | -68 | -94 | 1,00 | 0,201 | 2,77 |

## Plasebo (saat içi karıştırılmış sıra, aynı kural, 20 tekrar): günlük %

| Bacak | Kural | gerçek | plasebo ort. | plasebo en iyi |
|---|---|---|---|---|
| short | bant | +0,045 | -2,978 | -2,747 |
| short | kısmi λ 0,1 | +0,103 | -0,239 | -0,195 |
| long | bant | -0,470 | -3,491 | -3,137 |
| long | kısmi λ 0,1 | -0,111 | -0,431 | -0,356 |
