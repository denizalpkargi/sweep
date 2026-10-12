# Test #52 · Kaplumbağa + kalite süzgeçli short sepeti birlikte

11 Ekim 2026 · `node tests/test52-birlesik.js` (önce test52-ozan-kalite-72sa.js)

Kaplumbağa: canlı kod (turtle-test.js --replay döngüsü, ilk 50, %0,5 risk, en çok 10, nominal ≤ 2×), gün sonu değerlemesi. Short sepeti: masa short ∧ kalite en kötü %30 değil, 72 sa, stop 2 × sd, 100 $'dan bileşik, nominal ≤ 3×; gün sonu açık shortlar günlük kapanışla değerlenir. Her ikisi de anlık değerlemeli günlük eğri, dönem 2022-01-02 → 2026-10-09. 50/50 = her gün yarı yarıya dengelenmiş; "ikisi tam" = iki sepet aynı bakiyeyi tam kullanır (günlük getiriler toplanır, toplam nominal ≤ 5×).

| portföy | son bakiye $ | yıllık | en büyük düşüş | en kötü ay | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kaplumbağa tek başına | 133 | +6 % | −%29 | -7,7 % | -4 % | +20 % | +6 % | -8 % | +20 % |
| short (kalite %0,5 · N 5) tek başına | 197 | +15 % | −%26 | -13,8 % | +51 % | -4 % | +4 % | +22 % | +7 % |
| 50/50 Kaplumbağa + short (kalite %0,5 · N 5) | 176 | +13 % | −%13 | -7,1 % | +22 % | +9 % | +8 % | +8 % | +15 % |
| ikisi tam: Kaplumbağa + short (kalite %0,5 · N 5) | 287 | +25 % | −%24 | -13,8 % | +45 % | +17 % | +14 % | +14 % | +29 % |
| short (kalite %0,5 · N 10) tek başına | 305 | +26 % | −%48 | -23,5 % | +109 % | -23 % | +14 % | +45 % | +15 % |
| 50/50 Kaplumbağa + short (kalite %0,5 · N 10) | 240 | +20 % | −%22 | -12,3 % | +47 % | -1 % | +14 % | +20 % | +19 % |
| ikisi tam: Kaplumbağa + short (kalite %0,5 · N 10) | 468 | +38 % | −%40 | -23,5 % | +101 % | -4 % | +27 % | +39 % | +39 % |
| short (kalite %1 · N 5) tek başına | 293 | +25 % | −%46 | -26,0 % | +107 % | -11 % | +3 % | +40 % | +11 % |
| 50/50 Kaplumbağa + short (kalite %1 · N 5) | 243 | +20 % | −%24 | -13,7 % | +47 % | +7 % | +10 % | +19 % | +18 % |
| ikisi tam: Kaplumbağa + short (kalite %1 · N 5) | 463 | +38 % | −%44 | -26,0 % | +99 % | +11 % | +16 % | +34 % | +34 % |
| short (süzgeçsiz masa %0,5 · N 5) tek başına | 164 | +11 % | −%40 | -13,0 % | +35 % | -20 % | +5 % | +25 % | +14 % |
| 50/50 Kaplumbağa + short (süzgeçsiz masa %0,5 · N 5) | 161 | +10 % | −%15 | -6,6 % | +15 % | -0 % | +8 % | +9 % | +18 % |
| ikisi tam: Kaplumbağa + short (süzgeçsiz masa %0,5 · N 5) | 239 | +20 % | −%28 | -13,0 % | +29 % | -1 % | +15 % | +18 % | +38 % |

## Korelasyon (Kaplumbağa ↔ short sepeti)

| short sepeti | günlük | haftalık |
|---|---:|---:|
| kalite %0,5 · N 5 | -0,37 | -0,43 |
| kalite %0,5 · N 10 | -0,34 | -0,38 |
| kalite %1 · N 5 | -0,37 | -0,43 |
| süzgeçsiz masa %0,5 · N 5 | -0,37 | -0,43 |
