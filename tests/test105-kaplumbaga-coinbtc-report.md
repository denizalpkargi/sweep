# Test #105: Kaplumbağa girişinde coin/BTC kırılımı şartı

Canlı kod (src/turtle.js), arşiv 1g, ayın ilk 50 coini, 2020-06-01 → 2026-11-15, %0,5 risk · 10 pozisyon · 2×, taker + kayma (turtle-test.js --replay ile aynı; fonlama varsayılan). Yalnız evren listesi süzülür ya da sıralanır. Hücre: yıllık % / düşüş % / Sharpe.

| Sıra | işlem | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|
| a) bugün | 380 | +28 / -29 / 1,05 | +46 / -21 / 1,37 | +13 / -29 / 0,65 | +13 / -12 / 0,81 |
| b) coin/BTC kırılımı şartı | 373 | +16 / -28 / 0,74 | +24 / -23 / 0,93 | +10 / -28 / 0,53 | +9 / -12 / 0,66 |
| c) coin/BTC kırılımı olanlar önce | 383 | +29 / -29 / 1,08 | +49 / -22 / 1,42 | +12 / -29 / 0,64 | +13 / -12 / 0,81 |
| rastgele %5 | | +28 / -33 / 1,04 | +47 / -22 / 1,38 | +10 / -33 / 0,53 | +9 / -12 / 0,62 |
| rastgele medyan | | +30 / -30 / 1,10 | +50 / -20 / 1,43 | +13 / -30 / 0,67 | +16 / -12 / 0,91 |
| rastgele %95 | | +33 / -28 / 1,16 | +53 / -18 / 1,49 | +17 / -28 / 0,82 | +17 / -12 / 0,95 |

## Rastgele dağılımda yüzdelik (Sharpe)

| Sıra | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| a) bugün | %13 | %1 | %42 | %10 |
| b) coin/BTC kırılımı şartı | %0 | %0 | %5 | %6 |
| c) coin/BTC kırılımı olanlar önce | %32 | %38 | %34 | %10 |
