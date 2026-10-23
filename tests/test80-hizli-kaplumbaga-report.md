# Test #80 · Hızlı Kaplumbağa varyantları · 2026-10-16

Long, BTC > SMA200, giriş ayının ilk K coini; giriş sonraki mumun açılışı; çıkış X mumun dibi ya da giriş − 2N, felaket 4N; maliyet %0,08 × 2 + fonlama; R = getiri ÷ 2N. Dönem 2020-06 → 2026-10.

| varyant | n | ayda | ort. R | t | 1. yarı | 2. yarı | son 24 ay | son 12 ay | rastgele R | medyan tutuş (gün) | kazanma | portföy yıllık / düşüş (alınan) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| A 1d 20/10 ilk 50 | 1057 | 14.1 | +1,01 | +4,6 | +1,81 | +0,23 | +0,23 | +0,09 (68) | +0,57 | 18.0 | %31 | +30 % / -21 % (371) |
| B 1d 20/10 ilk 100 | 1953 | 26.1 | +0,80 | +5,5 | +1,61 | +0,00 | +0,05 | -0,09 (135) | +0,34 | 17.0 | %30 | +22 % / -30 % (457) |
| C 1h 20/10 ilk 50 | 1276 | 17.0 | +1,03 | +5,0 | +1,84 | +0,22 | +0,36 | +0,78 (79) | +0,39 | 18.2 | %32 | +31 % / -27 % (397) |
| D 4h 20/10 ilk 50 | 5872 | 78.4 | +0,13 | +2,8 | +0,23 | +0,03 | +0,05 | -0,02 (331) | +0,05 | 2.8 | %30 | +18 % / -65 % (2183) |
| E 4h 60/30 ilk 50 | 2761 | 36.9 | +0,37 | +3,1 | +0,47 | +0,27 | +0,24 | +0,18 (142) | +0,23 | 3.8 | %23 | +45 % / -46 % (1037) |
| F 4h 120/60 ilk 50 | 1600 | 21.4 | +0,87 | +4,2 | +1,19 | +0,56 | +0,54 | +0,71 (78) | +0,54 | 4.5 | %22 | +46 % / -40 % (629) |

Yıl yıl ort. R:

| varyant | 2020 | 2021 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|
| A | +5,68 | +1,33 | +0,41 | +0,27 | -0,20 | +0,20 |
| B | +5,16 | +1,73 | +0,51 | +0,15 | -0,28 | +0,03 |
| C | +6,06 | +1,14 | +0,54 | +0,18 | -0,11 | +0,97 |
| D | +0,43 | +0,33 | +0,07 | +0,02 | -0,07 | +0,19 |
| E | +0,66 | +0,69 | +0,25 | +0,46 | -0,16 | +0,46 |
| F | +2,59 | +1,54 | +0,43 | +0,35 | -0,01 | +0,87 |

**Not:** R varyantlar arasında kıyaslanamaz (4 sa varyantlarında N 4 sa ATR'si, stop daha dar). Kıyas işlem başı % ve aylık portföyle (`tests/test80-portfoy.py`; aylar ileri taşınır, özsermaye yalnız kapanışta güncellenir, düşüş iyimser).

| varyant | işlem başı % (yarılar) | portföy yıllık | yarılar | son 12 ay | düşüş | aylık Sharpe (yarılar) | A'dan fark t | A ile kor. |
|---|---|---:|---|---:|---:|---|---:|---:|
| A 1g 20/10 ilk 50 | +13,2 (+26,1 / +0,8) | +29 % | +44 / +16 | +5 % | −20 % | 0,79 (0,88 / 0,76) | – | – |
| B 1g ilk 100 | +11,1 (+24,2 / −1,9) | +21 % | +38 / +6 | −1 % | −28 % | 0,66 (0,85 / 0,39) | −1,4 | 0,95 |
| C 1 sa erken giriş | +13,2 (+25,8 / +0,5) | +30 % | +48 / +16 | +7 % | −24 % | 0,70 (0,80 / 0,67) | +0,7 | 0,97 |
| D 4 sa 20/10 | +0,6 (+1,4 / −0,2) | +18 % | +46 / −5 | −11 % | −63 % | 0,53 (0,93 / 0,11) | −0,1 | 0,12 |
| E 4 sa 60/30 | +1,6 (+2,3 / +0,8) | +43 % | +41 / +46 | +8 % | −43 % | 0,87 (1,02 / 0,82) | +0,7 | 0,19 |
| F 4 sa 120/60 | +6,0 (+10,0 / +2,0) | +44 % | +43 / +45 | +21 % | −36 % | 0,92 (1,07 / 0,85) | +0,9 | 0,54 |
| ½ A + ½ E | | +40 % | | +6 % | −28 % | 1,07 (1,31 / 0,89) | | |
| ½ A + ½ F | | +38 % | | +13 % | −26 % | 0,98 (1,10 / 0,85) | | |

2022 yok: BTC SMA200'ün altındaydı, hiçbir varyant işlem açmadı. Rastgele giriş (aynı süzgeç ve çıkış) bile artı R veriyor (A'da +0,57): kazancın büyük kısmı BTC > SMA200 rejiminde long durmaktan; A'nın rastgeleden farkı +0,44R, F'nin +0,33R.

## Sonuç

Hiçbir varyant tabanı (A) anlamlı geçmiyor (aylık fark t ≤ 0,9; geçme t ≥ 3). Daha geniş evren (B) ve 4 sa 20/10 (D) kötüleştiriyor. 20/10 günlük kanalı 4 sa kapanışla izlemek (F) ve 4 sa 60/30 (E) ikinci yarıda tabandan iyi, A ile düşük korelasyonlu; A ile yarı yarıya karışım Sharpe'ı 0,79 → 0,98–1,07'ye çıkarıyor ama düşüş büyüyor ve 6 varyant denendi (DSR ailesi 541 → 547). Sepet değişmez; F ve A+E/A+F karışımı izlemede.
