# Test #104: Kaplumbağa açık longlarını BTC short ile korumak

Canlı kod (src/turtle.js), arşiv 1g, ayın ilk 50'si, 2020-06-01 → 2026-11-14, %0,5 risk · 10 pozisyon · 2×, taker + kayma, Kaplumbağa 380 işlem. Koruma ayrı BTC perp short: açık long nominali × (1 ya da 60 g beta, [0,2]), gün kapanışında ayarlanır, fonlama arşivden, taker + kayma. Hücre: yıllık % / düşüş % / Sharpe. Koşul ve x = 20 önceden; seçim yok.

| Varyant | korumalı gün | korumanın toplam katkısı ($, 100 $ başlangıç) | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| korumasız (bugün) | %0 | +0,0 | +28 / -29 / 1,05 | +46 / -21 / 1,37 | +13 / -29 / 0,65 | +13 / -12 / 0,81 |
| A · 20 g tepede değilken · 1:1 | %50 | -155,9 | +21 / -29 / 0,86 | +36 / -23 / 1,25 | +7 / -29 / 0,41 | +11 / -14 / 0,64 |
| A · 20 g tepede değilken · beta | %50 | -192,6 | +18 / -35 / 0,77 | +32 / -29 / 1,15 | +6 / -35 / 0,36 | +9 / -16 / 0,51 |
| B · BTC < SMA200 · 1:1 | %5 | -14,0 | +27 / -29 / 1,02 | +43 / -21 / 1,29 | +14 / -29 / 0,69 | +14 / -12 / 0,83 |
| B · BTC < SMA200 · beta | %5 | -12,6 | +27 / -29 / 1,02 | +43 / -21 / 1,29 | +14 / -29 / 0,70 | +14 / -12 / 0,84 |
| C · her zaman · 1:1 (bilgi) | %61 | -161,9 | +20 / -28 / 0,89 | +46 / -18 / 1,47 | -1 / -28 / 0,07 | +5 / -14 / 0,43 |
| C · her zaman · beta (bilgi) | %60 | -212,0 | +17 / -36 / 0,75 | +42 / -22 / 1,32 | -3 / -36 / -0,03 | +3 / -17 / 0,24 |
| rastgele (A gibi) %5 | koşul %86 | | +13 / -46 / 0,59 | +35 / -29 / 1,05 | -8 / -45 / -0,21 | -2 / -21 / -0,04 |
| rastgele medyan | koşul %86 | | +20 / -31 / 0,85 | +44 / -20 / 1,37 | -0 / -30 / 0,10 | +6 / -15 / 0,44 |
| rastgele %95 | koşul %86 | | +25 / -22 / 1,08 | +53 / -15 / 1,72 | +6 / -21 / 0,40 | +22 / -12 / 1,03 |

## Rastgele dağılımda yüzdelik (Sharpe; düşüş)

| Varyant | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| A · 20 g tepede değilken · 1:1 | %53; %59 | %24; %19 | %95; %58 | %69; %59 |
| A · 20 g tepede değilken · beta | %33; %28 | %12; %5 | %92; %28 | %59; %38 |
| B · BTC < SMA200 · 1:1 | %89; %61 | %31; %34 | %100; %59 | %84; %94 |
| B · BTC < SMA200 · beta | %90; %62 | %30; %34 | %100; %60 | %84; %94 |

Yıllık katkı: korumanın kendi kârı/zararı (sütun 3) Kaplumbağa özkaynağına eklenir; Kaplumbağa boyu korumadan etkilenmez.
