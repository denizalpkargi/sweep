# Test #57 · 24 saatlik long için gün içi çıkış kuralları (arşiv)

11 Ekim 2026 gecesi · `node tests/test57-cikis-24sa.js` · 6.646 long, 2020-06-01 → 2026-10-08

Girişler canlı kuralla aynı (masa long + BTC 24 sa ≤ 0 + 7 g yönünde; Ozan süzgeci 2024-06 öncesi yok), giriş sonraki 15 dk VWAP. Her kural aynı girişlerde; fark = kural R − bugünkü R (R birimi 2 × sd). Haftalık t eşli farkın haftalık toplamları üzerinden.

| kural | ort. R | 1. yarı | 2. yarı | son 12 ay | fark tümü | fark yarılar / son 12 ay | fark haftalık t | geçti |
|---|---:|---:|---:|---:|---:|---|---:|---|
| L0 bugünkü: stop 2 × sd, 24 sa | +0,027 | +0,017 | +0,039 | +0,054 | – | – | — | – |
| L1 +1R → stop girişe | +0,016 | +0,008 | +0,025 | +0,038 | -0,011 | -0,009 / -0,014 / -0,016 | -1,3 | hayır |
| L2 +1R → yarısı + stop girişe | -0,006 | -0,017 | +0,008 | +0,008 | -0,033 | -0,034 / -0,032 / -0,046 | -2,3 | hayır |
| L3 baştan iz 2 × sd | -0,029 | -0,056 | +0,001 | -0,035 | -0,057 | -0,073 / -0,038 / -0,088 | -2,5 | hayır |
| L4 yalnız felaket 4 × ATR(1 sa) | +0,077 | +0,071 | +0,084 | +0,110 | +0,050 | +0,054 / +0,045 / +0,057 | +2,2 | hayır |
| L4b felaket 4 × ATR(1 sa), boy stopa göre (dolar riski eşit) | +0,020 | +0,022 | +0,017 | -0,012 | -0,008 | +0,005 / -0,023 / -0,066 | -0,4 | hayır |
| L5 BTC girişten −%2 → çık | -0,000 | -0,014 | +0,015 | -0,044 | -0,028 | -0,031 / -0,025 / -0,097 | -2,5 | hayır |
| L6 12 sa sonra çık | +0,020 | +0,034 | +0,005 | -0,012 | -0,007 | +0,017 / -0,034 / -0,065 | -0,3 | hayır |
| L7 kârda (≥1R) BTC 1 sa −%1 → çık | +0,004 | -0,024 | +0,036 | +0,049 | -0,023 | -0,041 / -0,003 / -0,005 | -2,6 | hayır |

## Geçenler

- Geçen yok.
