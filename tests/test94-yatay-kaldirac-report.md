# Test #94: yatay rejimde etkin kaldıraç aşınması (Trend sepeti)

Canlı kod (src/trend.js, varsayılan tv 1,4), BTC·ETH·SOL·BNB arşiv 1g, 2020-06-01 → 2026-10-18. Yatay = BTC 30 g getirisi |r| < %5 (gün başında). Taker + kayma, fonlama yok (replay-trend.js gibi).

## Rejim × etkin kaldıraç (bugünkü ayar)

| Rejim | kaldıraç | gün | ort. günlük % | yıllıklaştırılmış % | günlük σ % |
|---|---|---|---|---|---|
| yatay | nakit | 352 | -0,019 | -7 | 0,06 |
| yatay | 0–1x | 52 | -0,561 | -205 | 2,87 |
| yatay | 1–2x | 146 | 0,595 | 217 | 3,86 |
| yatay | 2x+ | 128 | 1,131 | 413 | 7,28 |
| trendli | nakit | 698 | -0,003 | -1 | 0,02 |
| trendli | 0–1x | 81 | 0,776 | 283 | 3,37 |
| trendli | 1–2x | 454 | 1,028 | 375 | 4,86 |
| trendli | 2x+ | 420 | 0,338 | 123 | 6,90 |

## Kaldıraç başına günlük getiri (yalnız pozisyonlu günler)

| Dönem | yatay % / 1x | trendli % / 1x | yatay gün payı |
|---|---|---|---|
| tümü | 0,346 | 0,360 | %29 |
| ilk yarı | 0,148 | 0,554 | %25 |
| ikinci yarı | 0,441 | 0,211 | %33 |
| son 12 ay | 0,554 | -0,112 | %36 |

## Varyant: yatayda tv ≤ 0,8

| Dönem | bugünkü yıllık % / düşüş % / Sharpe | tavanlı | fark (yıllık) |
|---|---|---|---|
| tümü | 181 / -65 / 1,68 | 156 / -63 / 1,63 | -25 |
| ilk yarı | 219 / -65 / 1,85 | 223 / -63 / 1,92 | 3 |
| ikinci yarı | 148 / -61 / 1,51 | 104 / -60 / 1,33 | -44 |
| son 12 ay | 20 / -49 / 0,58 | -7 / -48 / 0,16 | -27 |

## Yıl yıl (yıllık %: bugünkü → tavanlı)

| Yıl | bugünkü | tavanlı | yatay gün |
|---|---|---|---|
| 2020 | 324 | 317 | 50 |
| 2021 | 1435 | 1519 | 67 |
| 2022 | -52 | -54 | 92 |
| 2023 | 335 | 316 | 108 |
| 2024 | 256 | 189 | 106 |
| 2025 | 27 | 19 | 145 |
| 2026 | 21 | -7 | 110 |
