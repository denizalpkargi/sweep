# Test #99: Trend sepetinde BTC rejim kapısı (SMA50, SMA200, sıçrama modeli, rastgele)

Canlı kod (src/trend.js, tv 1,4), BTC·ETH·SOL·BNB arşiv 1g, 2021-01-01 → 2026-11-01, yarı 2023-12-03. Yalnız kapı değişir; taker + kayma, fonlama yok (replay-trend.js gibi). Sıçrama modeli: `tests/test99-sicrama-kapisi.py` (örneklem dışı, 6 ayda bir yeniden kurulur, λ ayda bir geçmiş örneklem dışı Sharpe ile seçilir).

## Trend sepeti: yıllık % / en büyük düşüş % / Sharpe

| Kapı | açık gün | yılda yön değişimi | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| SMA50 (bugün) | %53 | 20,7 | +141 / -65 / 1,52 | +194 / -65 / 1,83 | +97 / -61 / 1,24 | +14 / -49 / 0,52 |
| SMA200 | %56 | 9,2 | +101 / -66 / 1,34 | +127 / -66 / 1,53 | +79 / -57 / 1,16 | +24 / -29 / 0,70 |
| sıçrama (λ seçimli) | %43 | 18,7 | +94 / -62 / 1,31 | +138 / -62 / 1,66 | +58 / -57 / 0,99 | -16 / -37 / -0,10 |
| sıçrama λ 10 (sabit, bilgi) | %44 | 5,1 | +96 / -62 / 1,34 | +126 / -62 / 1,61 | +70 / -54 / 1,10 | -12 / -37 / -0,03 |
| sıçrama λ 30 (sabit, bilgi) | %45 | 3,4 | +66 / -60 / 1,11 | +85 / -58 / 1,36 | +49 / -60 / 0,92 | -41 / -41 / -1,07 |
| sıçrama λ 100 (sabit, bilgi) | %28 | 2,4 | +53 / -61 / 1,09 | +78 / -57 / 1,42 | +31 / -61 / 0,78 | -23 / -37 / -0,59 |
| rastgele (200, aynı açık pay ve değişim) medyan | %43 | 18,7 | +34 / -68 / 0,81 | +41 / -62 / 0,90 | +26 / -56 / 0,68 | -4 / -40 / 0,15 |
| rastgele %95 Sharpe | | | 1,45 | 1,68 | 1,51 | 1,19 |

## Kapı BTC'de tek başına (0/1, geçişte %0,10): yıllık % / düşüş % / Sharpe

| Kapı | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| al-tut | +19 / -77 / 0,59 | +11 / -77 / 0,49 | +28 / -53 / 0,76 | -26 / -47 / -0,48 |
| SMA50 (bugün) | +35 / -59 / 0,96 | +37 / -59 / 0,93 | +33 / -26 / 1,01 | +15 / -18 / 0,67 |
| SMA200 | +19 / -64 / 0,62 | +13 / -64 / 0,50 | +24 / -32 / 0,78 | +13 / -8 / 0,78 |
| sıçrama (λ seçimli) | +25 / -44 / 0,82 | +29 / -44 / 0,86 | +22 / -28 / 0,79 | +6 / -10 / 0,43 |
| sıçrama λ 10 (sabit, bilgi) | +18 / -50 / 0,64 | +15 / -50 / 0,56 | +21 / -40 / 0,74 | +7 / -8 / 0,47 |
| sıçrama λ 30 (sabit, bilgi) | +18 / -43 / 0,65 | +15 / -43 / 0,55 | +22 / -26 / 0,77 | -5 / -12 / -0,27 |
| sıçrama λ 100 (sabit, bilgi) | +12 / -52 / 0,51 | +7 / -52 / 0,37 | +18 / -26 / 0,68 | +3 / -7 / 0,30 |

Geçme (önceden): sıçrama kapısı iki yarıda ve son 12 ayda SMA50'den yüksek Sharpe, tam dönemde düşüş daha kötü değil ve rastgelelerin %95'inden iyi → **hayır**.
