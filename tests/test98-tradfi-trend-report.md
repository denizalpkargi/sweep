# Test #98: kripto dışı trend sepeti (altın + endeksler)

Kural taramadakiyle aynı: 1/3/12 ay işaret ortalaması × %15 oynaklık hedefi (en çok 3×), boy değişimine %0,06, perp fonlaması long günde %0,03. Gümüş geçmişi yok; endeks perp'leri için Nasdaq ve S&P 500 vekil. Dönem 2020-06 → 2026-10 (altın verisi 9 Ekim'de bitiyor).

| Seri | yıllık % / Sharpe / düşüş % (tümü) | 1. yarı Sharpe | 2. yarı Sharpe | son 12 ay Sharpe |
|---|---|---|---|---|
| altın | +2,1 / +0,17 / -34 | -0,52 | +0,70 | +0,37 |
| altın (fonlamasız) | +5,7 / +0,45 / -31 | -0,45 | +1,15 | +0,56 |
| Nasdaq | +1,2 / +0,10 / -20 | +0,06 | +0,14 | -0,63 |
| S&P 500 | -0,7 / -0,06 / -21 | -0,07 | -0,04 | -0,85 |
| altın + Nasdaq + S&P (eşit) | +0,9 / +0,10 / -20 | -0,25 | +0,41 | -0,46 |
| Kaplumbağa | +24,6 / +0,93 / -31 | +1,25 | +0,50 | +0,60 |

Günlük korelasyon Kaplumbağa ile: altın +0,03, üçlü sepet +0,16

| Birleşim | yıllık % / Sharpe / düşüş % | 1. yarı Sharpe | 2. yarı Sharpe | son 12 ay Sharpe |
|---|---|---|---|---|
| Kaplumbağa %90 + altın %10 | +22,3 / +0,93 / -27 | +1,23 | +0,55 | +0,62 |
| Kaplumbağa %90 + üçlü %10 | +22,2 / +0,93 / -28 | +1,24 | +0,52 | +0,58 |
| Kaplumbağa %80 + altın %20 | +20,1 / +0,94 / -24 | +1,19 | +0,61 | +0,63 |
| Kaplumbağa %80 + üçlü %20 | +19,9 / +0,92 / -25 | +1,22 | +0,54 | +0,54 |
