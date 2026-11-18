# Test #56 · Yeni listelenen coinlerde short (arşiv)

11 Ekim 2026 gecesi · `node tests/test56-yeni-liste.js` · 674 coin, listeleme 2020-07-02 → 2026-09-28

Short yönünde: net = −getiri − %0,16 − fonlama (short alır, yoksa günde %0,03 varsayılır). Fazla = −(coin − aynı günlerde ayın ilk 50 coininin ortalaması). t: listeleme haftası kümeli. Yeni coinlerde gerçek makas varsayımdan büyüktür.

| Pencere | n | Fazla % (t) | Fazla yarılar / son 12 ay % | Net % (t) | Net yarılar / son 12 ay % | Medyan net % | Kazanma | En kötü % | Geçti |
|---|---:|---|---|---|---|---:|---:|---:|---|
| 2. gün, 1 gün | 674 | +0,85 (+0,7) | +1,02 / +0,78 / +1,40 | +0,43 (+0,1) | +0,75 / +0,31 / +1,39 | +3,65 | %61 | -244 | hayır |
|  ↳ %30 felaket stoplu (sonradan) | 674 | | | +0,57 (+0,9) | +0,58 / +0,57 / +2,44 | +3,07 | %60 | -44 | – |
| 2. gün, 3 gün | 674 | +1,80 (+1,8) | +3,33 / +1,22 / +3,17 | +0,89 (+1,0) | +3,04 / +0,07 / +3,22 | +6,12 | %64 | -351 | hayır |
|  ↳ %30 felaket stoplu (sonradan) | 674 | | | +0,75 (+1,0) | +1,57 / +0,44 / +3,29 | +4,24 | %59 | -44 | – |
| 2. gün, 7 gün | 674 | +3,23 (+1,9) | +5,36 / +2,42 / +4,05 | +1,59 (+0,9) | +4,47 / +0,49 / +5,45 | +10,21 | %67 | -379 | hayır |
|  ↳ %30 felaket stoplu (sonradan) | 674 | | | +2,31 (+2,1) | +4,03 / +1,66 / +4,47 | +6,82 | %58 | -44 | – |
| 9. gün, 1 gün (geç) | 674 | -0,01 (+0,6) | +0,21 / -0,10 / +0,90 | -0,10 (+0,0) | -0,51 / +0,05 / +1,84 | +0,72 | %54 | -97 | hayır |
|  ↳ %30 felaket stoplu (sonradan) | 674 | | | -0,12 (-0,0) | -0,77 / +0,13 / +1,85 | +0,60 | %54 | -38 | – |

## Yıl yıl, 2. gün 7 gün short net % (n)

| 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|
| +6,39 (51) | +3,48 (58) | -0,26 (25) | +4,23 (98) | -1,37 (131) | +0,61 (239) | +2,34 (72) |

## Geçenler

- Geçen yok.
