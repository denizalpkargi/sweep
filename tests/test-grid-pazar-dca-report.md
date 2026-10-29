# DCA botu (3Commas tarzı) · arşiv testi

Evren: ayın hacimce ilk 30 coini, 15 dk, 2020-06 → 2026-10. Her coinde bir long bot; anlaşma kapanınca sonraki mumda yenisi (coin evrendeyken). Taban emir + 5 güvenlik emri: sapmalar 2,0 %, 4,4 %, 7,3 %, 10,7 %, 14,9 %; boylar sermayenin 7,0 %, 7,0 %, 10,6 %, 15,9 %, 23,8 %, 35,7 %. Kâr al ortalamanın %1,5 üstünde (maker). Limit emirler fiyat seviyeyi %0,05 geçerse dolar. Taban emir taker+kayma, güvenlik emirleri maker. Fonlama arşivden.

**Aylık fazla** = botun o ayki piyasa değerli kâr/zararı − ay başındaki coin payını ay boyunca tutmak (ay başında boştaysa kıyas sıfır). Sermaye 1 = tüm güvenlik emirleri dolduğunda kullanılan para.

| Varyant | Anlaşma | Kazanan % | Anlaşma ort. | Bot aylık getirisi | Aylık fazla: tümü | 1. yarı | 2. yarı | Son 12 ay | En kötü anlaşma | Bitmemiş (veri sonu) |
|---|---|---|---|---|---|---|---|---|---|---|
| 3Commas varsayılanı (stopsuz) | 61228 | 99,8 % | 0,24 % | 0,05 % (ay ort. 0,73 %, t 0,7, n 6480) | -0,18 % (ay ort. -0,02 %, t -0,1, n 6480) | 0,05 % (ay ort. 0,24 %, t 0,4, n 2081) | -0,30 % (ay ort. -0,29 %, t -1,5, n 4399) | -0,35 % (ay ort. -0,35 %, t -1,6, n 1776) | -15 % | 184 (ort. -78 %) |
| −%25 stop | 186818 | 98,4 % | -0,03 % | -2,06 % (ay ort. -1,99 %, t -1,7, n 2875) | -2,70 % (ay ort. -2,66 %, t -4,0, n 2875) | -2,19 % (ay ort. -2,17 %, t -2,0, n 1368) | -3,17 % (ay ort. -3,17 %, t -4,2, n 1507) | -3,30 % (ay ort. -3,35 %, t -3,1, n 475) | -21 % | 37 (ort. -3 %) |
| RSI(14) < 30 ile başla, stopsuz | 28042 | 99,9 % | 0,25 % | 0,43 % (ay ort. 0,61 %, t 1,0, n 3821) | 0,18 % (ay ort. 0,43 %, t 1,3, n 3821) | 0,74 % (ay ort. 1,00 %, t 1,7, n 1492) | -0,17 % (ay ort. -0,15 %, t -0,6, n 2329) | -0,30 % (ay ort. -0,33 %, t -0,6, n 862) | -13 % | 72 (ort. -73 %) |

## Anlaşmaların dağılımı (stopsuz varyant)

| Dolan güvenlik emri | Anlaşma | Ort. kâr | Ort. süre (sa) | Ort. en derin zarar |
|---|---|---|---|---|
| 0 | 34132 | 0,10 % | 1 | 0,0 % |
| 1 | 13058 | 0,20 % | 5 | 0,2 % |
| 2 | 6331 | 0,35 % | 10 | 0,6 % |
| 3 | 3479 | 0,57 % | 19 | 1,4 % |
| 4 | 1983 | 0,91 % | 29 | 2,9 % |
| 5 | 2245 | 1,19 % | 416 | 15,1 % |

| Yıl | Bot aylık getirisi (ort.) | Aylık fazla |
|---|---|---|
| 2020 | 3,84 % (ay ort. 4,15 %, t 0,8, n 241) | -0,69 % (ay ort. -0,23 %, t -0,1, n 241) |
| 2021 | 8,27 % (ay ort. 7,79 %, t 1,9, n 488) | 1,76 % (ay ort. 1,77 %, t 1,6, n 488) |
| 2022 | -4,92 % (ay ort. -5,09 %, t -2,1, n 717) | -0,80 % (ay ort. -0,86 %, t -2,0, n 717) |
| 2023 | 1,97 % (ay ort. 1,87 %, t 1,3, n 1012) | -0,03 % (ay ort. -0,02 %, t -0,1, n 1012) |
| 2024 | 0,98 % (ay ort. 0,71 %, t 0,3, n 1124) | -0,04 % (ay ort. -0,05 %, t -0,1, n 1124) |
| 2025 | -2,51 % (ay ort. -2,55 %, t -1,9, n 1387) | -0,44 % (ay ort. -0,48 %, t -1,3, n 1387) |
| 2026 | -0,48 % (ay ort. -0,53 %, t -0,7, n 1511) | -0,41 % (ay ort. -0,43 %, t -1,9, n 1511) |

_Süre 268 sn · node tests/test-grid-pazar.js --part dca --top 30_
