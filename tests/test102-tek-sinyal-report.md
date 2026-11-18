# Test #102: Trend sepetinde tek uzun süreli sinyal

Canlı kod (src/trend.js, tv 1,4), BTC·ETH·SOL·BNB, 2020-06-01 → 2026-11-08. Yalnız puan değişir; oynaklık hedefi, BTC SMA50 kapısı, bant ve maliyet aynı. Hücre: yıllık % / düşüş % / Sharpe.

## 00 UTC kesimi

| Puan | devir (yılda ×özkaynak) | tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|
| bugün (SMA 10/20/50/100 payı) | 76,1 | +173 / -64 / 1,65 | +208 / -64 / 1,82 | +141 / -61 / 1,48 | +14 / -49 / 0,52 |
| EMA 112 işareti | 45,2 | +131 / -58 / 1,48 | +164 / -54 / 1,75 | +102 / -58 / 1,26 | -7 / -35 / 0,13 |
| SMA 100 işareti | 50,5 | +155 / -66 / 1,53 | +199 / -66 / 1,72 | +117 / -57 / 1,33 | +25 / -35 / 0,65 |

## Altı kesim saatinde Sharpe (en kötü – ortanca – en iyi)

| Puan | tümü | 1. yarı | 2. yarı | son 12 ay | kesimlerde bugünü geçme |
|---|---|---|---|---|---|
| bugün (SMA 10/20/50/100 payı) | 1,52 – 1,58 – 1,78 | 1,57 – 1,73 – 2,09 | 1,38 – 1,46 – 1,52 | 0,34 – 0,54 – 0,73 | — |
| EMA 112 işareti | 1,31 – 1,39 – 1,52 | 1,60 – 1,69 – 1,85 | 1,08 – 1,21 – 1,26 | -0,62 – 0,06 – 0,57 | 0/6 |
| SMA 100 işareti | 1,41 – 1,47 – 1,67 | 1,53 – 1,61 – 2,00 | 1,28 – 1,32 – 1,43 | 0,28 – 0,63 – 0,67 | 0/6 |
