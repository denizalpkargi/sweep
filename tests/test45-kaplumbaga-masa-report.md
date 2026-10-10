# Test #45 · Kaplumbağa girişi + masanın "gir" demesi (arşiv)

10 Ekim 2026 · `node tests/test45-kaplumbaga-masa.js` · tanım `dongu/2026-10-10-r-kaldiraclari.md` §10

İşlemler `research-daily-wide.js`'ten (ayın ilk 50 coini, delist dahil, kapanışta sinyal, ertesi açılışta giriş, %0,08 + fonlama, R = getiri ÷ 2N). Masa: girişten önceki son long toplantı (en çok 8 sa önce; masa yalnız ayın ilk 30 coininde ve 4 saatte bir toplanıyor). **gir** = veto yok, puan ≥ 35, evet ≥ 3. **24 sa** = girişten önceki 24 sa'te en az bir "gir". Rastgele taban: masa verisi olan işlemlerde etiketleri 10.000 kez karıştırıp "gir − girme" farkının bu kadar büyük çıkma olasılığı (p, tek yönlü). R ortalamaları kalın kuyruklu: medyan ve en iyi %5 hariç ortalama da verildi.

## Kaplumbağa 1 (20/10) long + BTC > SMA200 · sepetin kuralı

801 işlem (2020-07-23 → 2026-09-30), masa verisi olan 483.

| grup | R (ort · medyan · en iyi %5 hariç) | R tümü / 1. yarı / 2. yarı / son 12 ay |
|---|---|---|
| hepsi | +0,93 · med -0,87 · %95'i -0,17 (801) | +0,93 / +1,51 / +0,53 / +0,49 |
| masa verisi yok | +1,03 · med -0,90 · %95'i -0,04 (318) | +1,03 / +1,49 / +0,68 / +0,24 |
| masa verisi var | +0,87 · med -0,84 · %95'i -0,26 (483) | +0,87 / +1,51 / +0,43 / +0,65 |
| **son toplantı gir** | +0,78 · med -0,81 · %95'i -0,24 (242) | +0,78 / +1,44 / +0,36 / +0,95 |
| son toplantı girme | +0,96 · med -0,84 · %95'i -0,30 (241) | +0,96 / +1,58 / +0,51 / +0,32 |
| son 24 sa en az bir gir | +0,89 · med -0,78 · %95'i -0,25 (419) | +0,89 / +1,43 / +0,54 / +0,73 |
| son 24 sa hiç gir yok | +0,74 · med -1,04 · %95'i -0,29 (64) | +0,74 / +1,95 / -0,39 / -0,27 |

Son toplantı: fark -0,19R, karıştırma p = 0,620; en iyi %5 hariç fark +0,10R.
Son 24 sa: fark +0,15R, karıştırma p = 0,482; en iyi %5 hariç fark -0,10R. Puan ile R Spearman +0,055.

| yıl | 2020 | 2021 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|
| gir | +4,85 (28) | +0,62 (35) | +0,36 (49) | +0,09 (62) | -0,33 (50) | +1,29 (18) |
| girme | +5,55 (18) | +1,42 (57) | +0,76 (49) | +0,12 (67) | -0,07 (34) | +0,56 (16) |
| veri yok | +10,01 (15) | +1,03 (75) | +0,57 (85) | +0,92 (69) | -0,43 (54) | +0,57 (20) |

## Kaplumbağa 1 long, süzgeçsiz

1.328 işlem (2020-06-02 → 2026-09-30), masa verisi olan 788.

| grup | R (ort · medyan · en iyi %5 hariç) | R tümü / 1. yarı / 2. yarı / son 12 ay |
|---|---|---|
| hepsi | +0,67 · med -0,79 · %95'i -0,23 (1.328) | +0,67 / +1,04 / +0,35 / -0,08 |
| masa verisi yok | +0,79 · med -0,85 · %95'i -0,11 (540) | +0,79 / +1,18 / +0,43 / -0,12 |
| masa verisi var | +0,60 · med -0,75 · %95'i -0,30 (788) | +0,60 / +0,93 / +0,29 / -0,05 |
| **son toplantı gir** | +0,54 · med -0,70 · %95'i -0,27 (411) | +0,54 / +0,91 / +0,23 / +0,01 |
| son toplantı girme | +0,66 · med -0,84 · %95'i -0,33 (377) | +0,66 / +0,96 / +0,36 / -0,15 |
| son 24 sa en az bir gir | +0,62 · med -0,73 · %95'i -0,29 (679) | +0,62 / +0,87 / +0,40 / +0,04 |
| son 24 sa hiç gir yok | +0,43 · med -1,04 · %95'i -0,35 (109) | +0,43 / +1,37 / -0,40 / -0,46 |

Son toplantı: fark -0,12R, karıştırma p = 0,621; en iyi %5 hariç fark +0,10R.
Son 24 sa: fark +0,20R, karıştırma p = 0,398; en iyi %5 hariç fark +0,13R. Puan ile R Spearman +0,045.

| yıl | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| gir | +3,76 (42) | +0,68 (47) | -0,79 (54) | +0,80 (72) | +0,37 (73) | -0,31 (55) | +0,11 (68) |
| girme | +4,29 (24) | +1,52 (72) | -0,94 (55) | +1,25 (68) | +0,12 (75) | +0,15 (39) | -0,26 (44) |
| veri yok | +10,01 (15) | +1,42 (102) | -0,67 (78) | +1,24 (121) | +0,63 (90) | -0,43 (65) | +0,04 (69) |

## Kaplumbağa 2 (55/20) long + BTC süzgeci

497 işlem (2020-07-23 → 2026-10-06), masa verisi olan 285.

| grup | R (ort · medyan · en iyi %5 hariç) | R tümü / 1. yarı / 2. yarı / son 12 ay |
|---|---|---|
| hepsi | +1,58 · med -1,09 · %95'i -0,10 (497) | +1,58 / +2,36 / +0,84 / +1,15 |
| masa verisi yok | +1,82 · med -1,10 · %95'i -0,02 (212) | +1,82 / +3,01 / +0,65 / +0,42 |
| masa verisi var | +1,41 · med -1,08 · %95'i -0,19 (285) | +1,41 / +1,86 / +0,98 / +1,53 |
| **son toplantı gir** | +1,96 · med -1,09 · %95'i -0,03 (159) | +1,96 / +2,99 / +0,91 / +1,50 |
| son toplantı girme | +0,72 · med -1,08 · %95'i -0,35 (126) | +0,72 / +0,31 / +1,06 / +1,56 |
| son 24 sa en az bir gir | +1,49 · med -1,09 · %95'i -0,17 (254) | +1,49 / +2,01 / +1,06 / +1,54 |
| son 24 sa hiç gir yok | +0,75 · med -1,04 · %95'i -0,23 (31) | +0,75 / +1,16 / -0,43 / +1,52 |

Son toplantı: fark +1,24R, karıştırma p = 0,138; en iyi %5 hariç fark +0,15R.
Son 24 sa: fark +0,74R, karıştırma p = 0,417; en iyi %5 hariç fark -0,29R. Puan ile R Spearman -0,045.

| yıl | 2020 | 2021 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|
| gir | +9,48 (26) | +0,54 (30) | +0,58 (42) | +0,24 (28) | +0,12 (23) | +1,50 (10) |
| girme | +3,01 (6) | +0,27 (40) | +2,14 (22) | -0,05 (28) | -0,63 (17) | +2,04 (13) |
| veri yok | +10,35 (10) | +3,60 (61) | +1,16 (59) | +0,04 (49) | -0,73 (21) | +0,56 (12) |

## 10 g kırılım long + BTC süzgeci

1.512 işlem (2020-07-26 → 2026-09-28), masa verisi olan 942.

| grup | R (ort · medyan · en iyi %5 hariç) | R tümü / 1. yarı / 2. yarı / son 12 ay |
|---|---|---|
| hepsi | +0,25 · med -0,67 · %95'i -0,22 (1.512) | +0,25 / +0,15 / +0,33 / +0,26 |
| masa verisi yok | +0,36 · med -0,59 · %95'i -0,16 (570) | +0,36 / +0,22 / +0,46 / -0,07 |
| masa verisi var | +0,18 · med -0,69 · %95'i -0,26 (942) | +0,18 / +0,10 / +0,25 / +0,48 |
| **son toplantı gir** | +0,25 · med -0,73 · %95'i -0,15 (331) | +0,25 / +0,10 / +0,38 / +0,68 |
| son toplantı girme | +0,15 · med -0,68 · %95'i -0,32 (611) | +0,15 / +0,11 / +0,19 / +0,36 |
| son 24 sa en az bir gir | +0,26 · med -0,70 · %95'i -0,21 (613) | +0,26 / +0,13 / +0,39 / +0,64 |
| son 24 sa hiç gir yok | +0,04 · med -0,68 · %95'i -0,35 (329) | +0,04 / +0,05 / +0,03 / +0,18 |

Son toplantı: fark +0,10R, karıştırma p = 0,290; en iyi %5 hariç fark +0,08R.
Son 24 sa: fark +0,22R, karıştırma p = 0,110; en iyi %5 hariç fark +0,02R. Puan ile R Spearman -0,012.

| yıl | 2020 | 2021 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|
| gir | +0,37 (57) | +0,18 (70) | +0,46 (63) | +0,37 (61) | -0,43 (63) | +1,36 (17) |
| girme | +0,11 (37) | +0,38 (163) | +0,16 (124) | +0,03 (133) | -0,19 (125) | +0,86 (29) |
| veri yok | +2,55 (21) | +0,21 (138) | +0,38 (150) | +0,74 (118) | -0,34 (113) | +0,48 (30) |

