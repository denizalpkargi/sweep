# Test #76 · Perp primi (baz) coinler arası L−S · 2026-10-15

Evren ayın ilk 30 coini (önceki ayın hacmi, TradFi hariç); sinyal 7 günlük ortalama perp primi (premiumIndexKlines 15 dk); en düşük beşte bir long, en yüksek beşte bir short; giriş ertesi gün açılışı; maliyet ağırlık değişimi × %0,08; fonlama dahil; basit getiri. Getiriler özkaynağa göre (bacak başına %50).

## Tutuş 1 gün (2412 dönem, 2020-03-01 → 2026-10-13)

| dönem | n | long % | short % | brüt L−S % | maliyet % | net % | t (net) | rastgele net % | IC | fonlama long / short % | en kötü coin bacağı % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tümü | 2412 | +0,060 | +0,000 | +0,061 | +0,020 | +0,041 | +0,9 | -0,140 | +0,009 | +0,069 / +0,031 | -339,0 |
| 1. yarı | 1206 | +0,122 | +0,031 | +0,152 | +0,021 | +0,131 | +2,8 | -0,145 | +0,016 | +0,026 / +0,040 | -96,9 |
| 2. yarı | 1206 | -0,001 | -0,031 | -0,031 | +0,019 | -0,050 | -0,7 | -0,134 | +0,003 | +0,112 / +0,022 | -339,0 |
| son 12 ay | 366 | -0,052 | +0,176 | +0,124 | +0,015 | +0,109 | +0,6 | -0,141 | -0,014 | +0,253 / +0,029 | -339,0 |

Yıl yıl net % (dönem başı): 2020 +0,191 (306.0) · 2021 +0,323 (359.0) · 2022 -0,075 (365.0) · 2023 -0,000 (365.0) · 2024 -0,007 (366.0) · 2025 -0,290 (365.0) · 2026 +0,208 (286.0)

Bileşik: +47 %, en büyük düşüş -87 %.

## Tutuş 7 gün (343 dönem, 2020-03-05 → 2026-10-01)

| dönem | n | long % | short % | brüt L−S % | maliyet % | net % | t (net) | rastgele net % | IC | fonlama long / short % | en kötü coin bacağı % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tümü | 343 | +0,397 | -0,221 | +0,176 | +0,076 | +0,100 | +0,2 | -0,142 | +0,019 | +0,365 / +0,173 | -1393,0 |
| 1. yarı | 171 | +0,790 | +0,128 | +0,917 | +0,079 | +0,839 | +1,9 | -0,104 | +0,024 | +0,121 / +0,243 | -121,2 |
| 2. yarı | 172 | +0,006 | -0,567 | -0,561 | +0,073 | -0,634 | -0,8 | -0,179 | +0,015 | +0,607 / +0,103 | -1393,0 |
| son 12 ay | 53 | -0,355 | +1,166 | +0,810 | +0,064 | +0,746 | +0,8 | -0,046 | +0,013 | +1,494 / +0,130 | -115,8 |

Yıl yıl net % (dönem başı): 2020 +0,736 (44.0) · 2021 +1,951 (51.0) · 2022 +0,278 (52.0) · 2023 -0,678 (52.0) · 2024 +0,393 (52.0) · 2025 -2,317 (52.0) · 2026 +0,585 (40.0)

Bileşik: -170 %, en büyük düşüş -126 %.

## Sonuç

Geçme (iki yarı ve son 12 ay net artı ve rastgeleden iyi, tüm dönem t ≥ 3): 1 g **geçmedi**, 7 g **geçmedi**.

Not: short bacağında coin başına kayıp sınırsız (stopsuz); 7 g tutuşta tek coin −%1393 gördü, bileşik −%100 altı bu yüzden: yüksek primli coinler sıkışmada patlıyor. IC ≈ 0 olduğundan `baz7` Kaan'a faktör olarak da eklenmez.
