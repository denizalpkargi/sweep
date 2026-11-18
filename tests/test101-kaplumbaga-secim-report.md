# Test #101: Kaplumbağa yer doluyken sinyal seçimi

Canlı kod (src/turtle.js), arşiv 1g, ayın ilk 50 coini, 2020-06-01 → 2026-11-07, %0,5 risk · 10 pozisyon · 2×, taker + kayma (turtle-test.js --replay ile aynı; fonlama varsayılan). Yalnız giriş sırası değişir. Hücre: yıllık % / düşüş % / Sharpe.

| Sıra | işlem | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|
| bugün (aylık hacim sırası) | 379 | +28 / -29 / 1,06 | +46 / -21 / 1,37 | +12 / -29 / 0,64 | +14 / -11 / 0,83 |
| korelasyon en düşük önce | 386 | +30 / -30 / 1,10 | +46 / -21 / 1,37 | +16 / -30 / 0,77 | +13 / -11 / 0,79 |
| 20 g oynaklık en düşük önce | 373 | +31 / -33 / 1,12 | +52 / -18 / 1,46 | +14 / -33 / 0,68 | +17 / -12 / 0,95 |
| 30 g hacim en yüksek önce | 378 | +28 / -27 / 1,06 | +47 / -20 / 1,38 | +12 / -27 / 0,65 | +15 / -12 / 0,87 |
| rastgele %5 | | +27 / -32 / 1,03 | +47 / -22 / 1,39 | +9 / -32 / 0,50 | +10 / -12 / 0,64 |
| rastgele medyan | | +30 / -31 / 1,10 | +50 / -20 / 1,45 | +13 / -31 / 0,66 | +16 / -12 / 0,93 |
| rastgele %95 | | +33 / -28 / 1,18 | +53 / -18 / 1,50 | +17 / -28 / 0,82 | +17 / -11 / 0,97 |

## Rastgele dağılımda yüzdelik (Sharpe)

| Sıra | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| bugün (aylık hacim sırası) | %17 | %2 | %42 | %14 |
| korelasyon en düşük önce | %52 | %1 | %90 | %10 |
| 20 g oynaklık en düşük önce | %61 | %61 | %54 | %76 |
| 30 g hacim en yüksek önce | %19 | %4 | %45 | %26 |
