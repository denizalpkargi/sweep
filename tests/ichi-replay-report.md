# Ichimoku sepeti · canlı kodla tekrar oynatma

11 Ekim 2026 · `node tests/ichi-test.js --replay` (veri: tests/sm-fetch.js; evren: her ayın önceki 30 gününün hacmine göre ilk 50 COIN perp'i, delist dahil, tests/sm-aday.js). src/ichi.js ve src/turtle.js fonksiyonları doğrudan; 4 sa mum içinde stop/hedef, kapanışta Kijun çıkışı ve yeni giriş sonraki açılıştan; taker %0,05 + kayma %0,03 her tarafta; fonlama arşivden. Bakiye eğrileri gün sonu değerlemeli (açık pozisyonlar kapanışla).

## 1. Araştırmayla kıyas (sınırsız portföy)

| | İşlem | Ort. R | 1. yarı | 2. yarı | Son 12 ay | Long | Short |
|---|---|---|---|---|---|---|---|
| canlı kod (src/ichi.js) | 10229 | 0,077 | 0,095 | 0,062 | 0,069 | 0,058 (4595) | 0,092 |
| araştırma (sm-aday.js, geniş evren) | 10.245 | 0,076 | 0,095 | 0,061 | 0,066 | | |

## 2. Bakiye (100 $'dan bileşik, gün sonu değerlemeli)

| Sepet | İşlem | Ort. R | Son $ | Yıllık | En büyük düşüş | En kötü ay | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ichimoku · %0,5 risk · 10 pozisyon · 2× | 7108 | 0,073 | 1067 | 42 % | −%25 | -13,4 % | 29 % | 35 % | 85 % | 8 % | 59 % | 70 % | 13 % |
| Ichimoku · %1 risk · 10 pozisyon · 2× | 7073 | 0,073 | 6083 | 85 % | −%42 | -24,8 % | 51 % | 70 % | 215 % | 3 % | 111 % | 173 % | 26 % |
| Ichimoku · %0,5 risk · 20 pozisyon · 3× | 9624 | 0,072 | 1990 | 56 % | −%31 | -18,2 % | 37 % | 42 % | 132 % | 10 % | 78 % | 76 % | 29 % |
| Kaplumbağa (canlı kod, aynı evren, %0,5 · 10 · 2×) | 376 | 1,455 | 517 | 29 % | −%29 | -8,8 % | 53 % | 149 % | -3 % | 21 % | 6 % | -8 % | 19 % |
| Ichimoku + Kaplumbağa · 50/50 (her gün dengelenmiş) |  |  | 812 | 39 % | −%19 | -6,4 % | 39 % | 91 % | 35 % | 16 % | 32 % | 27 % | 17 % |
| Ichimoku + Kaplumbağa · ikisi tam (aynı bakiye, nominal ≤ 4×) |  |  | 5373 | 87 % | −%35 | -12,5 % | 87 % | 241 % | 80 % | 30 % | 70 % | 57 % | 34 % |

Ichimoku (%0,5 · 10 · 2×) ↔ Kaplumbağa günlük getiri korelasyonu **-0,06**, haftalık **0,02** (2322 gün, 2020-06 → 2026-10-11).

## 3. Kalite short sepetiyle (yıllık)

Kalite short sepetinin işlem verisi (tests/data/arch/_t52-trades.json) bu ortamda yok; yıllık getirileri tests/test52-birlesik-report.md'den (%0,5 risk, en çok 5 short). 5 yıllık nokta korelasyon için az; yalnız yön.

| Yıl | Ichimoku (%0,5 · 10 · 2×) | Kaplumbağa (bu koşu) | Kalite short |
|---|---|---|---|
| 2022 | 85 % | -3 % | 51 % |
| 2023 | 8 % | 21 % | -4 % |
| 2024 | 59 % | 6 % | 4 % |
| 2025 | 70 % | -8 % | 22 % |
| 2026 | 13 % | 19 % | 7 % |

Yıllık korelasyon Ichimoku ↔ kalite short 0,80 (5 nokta).

## 4. Yıl yıl ortalama R (sınırsız portföy)

| 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|
| 0,08 (876) | 0,06 (1681) | 0,17 (1516) | 0,02 (1748) | 0,09 (1572) | 0,07 (1557) | 0,07 (1279) |
