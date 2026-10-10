# Test #50 · Günlük kırılımlar: Williams (#4) ve 10/5 (#9)

10 Ekim 2026 · `node tests/test50-gunluk-kirilim.js`

Evren her ay hacimce ilk 50 coin (TradFi hariç, delist dahil), 2020-06 → 2026-10. Maliyet taraf başı %0,08 + arşiv fonlaması, basit getiri. R = getiri ÷ girişteki stop uzaklığı (Williams: önceki günün aralığı; Donchian: 2N). Williams'ta giriş günü dip stopa değdiyse stop sayıldı (kötümser). Portföy %0.5 risk, en çok 10 pozisyon, nominal ≤ 2x; özsermaye kapanan işlemlerle (düşüş alt sınır). "Haftalık t": haftalık R toplamları. "İlk %5 hariç": en iyi %5 işlem atılınca ort. R.

| Sistem | Yön | BTC SMA200 | İşlem | Ort. R | 1. yarı | 2. yarı | Son 24 ay | Haftalık t | Kazanma | % / işlem | İlk %5 hariç R | Yıllık | Düşüş | Yarılar yıllık |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Williams k = 0,5 (ilk kârlı açılış) | long | yok | 30450 | -0,15 | -0,16 | -0,14 | -0,13 | -9,7 | %53 | -0,85% | -0,28 | -94% | −100% | -94% / -94% |
| Williams k = 0,5 (ilk kârlı açılış) | long | var | 17522 | -0,16 | -0,15 | -0,16 | -0,13 | -7,7 | %52 | -0,91% | -0,29 | -81% | −100% | -78% / -83% |
| Williams k = 0,5 (ilk kârlı açılış) | short | yok | 31871 | -0,15 | -0,14 | -0,16 | -0,12 | -8,4 | %56 | -1,22% | -0,26 | -90% | −100% | -88% / -92% |
| Williams k = 0,5 (ilk kârlı açılış) | short | var | 12842 | -0,14 | -0,12 | -0,17 | -0,14 | -4,8 | %56 | -0,96% | -0,25 | -63% | −100% | -58% / -67% |
| Williams k = 0,3 (duyarlılık) | long | yok | 36515 | -0,09 | -0,09 | -0,08 | -0,07 | -5,9 | %58 | -0,52% | -0,20 | -89% | −100% | -89% / -88% |
| Williams k = 0,3 (duyarlılık) | long | var | 20939 | -0,09 | -0,08 | -0,10 | -0,07 | -4,7 | %58 | -0,57% | -0,21 | -72% | −100% | -66% / -77% |
| Williams k = 0,3 (duyarlılık) | short | yok | 38250 | -0,07 | -0,06 | -0,08 | -0,06 | -4,2 | %62 | -0,72% | -0,17 | -80% | −100% | -77% / -83% |
| Williams k = 0,3 (duyarlılık) | short | var | 15462 | -0,07 | -0,04 | -0,10 | -0,06 | -2,3 | %62 | -0,64% | -0,17 | -49% | −99% | -44% / -53% |
| Williams k = 0,7 (duyarlılık) | long | yok | 24674 | -0,32 | -0,33 | -0,30 | -0,29 | -21,0 | %42 | -1,85% | -0,45 | -96% | −100% | -98% / -98% |
| Williams k = 0,7 (duyarlılık) | long | var | 14382 | -0,33 | -0,33 | -0,33 | -0,32 | -15,8 | %41 | -1,97% | -0,47 | -92% | −100% | -90% / -92% |
| Williams k = 0,7 (duyarlılık) | short | yok | 25819 | -0,31 | -0,31 | -0,31 | -0,26 | -16,5 | %45 | -2,30% | -0,43 | -96% | −100% | -95% / -97% |
| Williams k = 0,7 (duyarlılık) | short | var | 10339 | -0,30 | -0,29 | -0,30 | -0,27 | -10,0 | %45 | -1,96% | -0,41 | -74% | −100% | -72% / -75% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) | long | yok | 4616 | +0,15 | +0,19 | +0,11 | +0,03 | +2,1 | %31 | +1,62% | -0,17 | +22% | −32% | +27% / +18% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) | long | var | 2833 | +0,21 | +0,21 | +0,21 | +0,13 | +2,3 | %32 | +2,68% | -0,14 | +23% | −28% | +29% / +18% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) | short | yok | 5308 | +0,00 | +0,03 | -0,02 | -0,02 | +0,0 | %41 | -0,02% | -0,10 | +6% | −12% | +6% / +7% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) | short | var | 2282 | +0,05 | +0,14 | -0,03 | +0,04 | +1,1 | %44 | +1,04% | -0,06 | +2% | −18% | +6% / -2% |
| 10 g / 10 g | long | yok | 3606 | +0,29 | +0,42 | +0,18 | +0,06 | +2,3 | %30 | +3,74% | -0,24 | +23% | −34% | +26% / +21% |
| 10 g / 10 g | long | var | 2155 | +0,37 | +0,53 | +0,24 | +0,07 | +2,2 | %30 | +4,73% | -0,23 | +18% | −27% | +22% / +13% |
| 10 g / 10 g | short | yok | 3880 | +0,01 | +0,06 | -0,04 | -0,01 | +0,2 | %43 | +0,14% | -0,13 | +4% | −17% | +3% / +5% |
| 10 g / 10 g | short | var | 1573 | +0,10 | +0,26 | -0,03 | +0,11 | +1,4 | %45 | +1,83% | -0,06 | +2% | −16% | +6% / -1% |
| Kaplumbağa 1 · 20 / 10 (kıyas) | long | yok | 2247 | +0,54 | +0,69 | +0,39 | +0,27 | +3,1 | %35 | +6,84% | -0,15 | +29% | −22% | +27% / +30% |
| Kaplumbağa 1 · 20 / 10 (kıyas) | long | var | 1403 | +0,62 | +0,73 | +0,52 | +0,33 | +3,2 | %35 | +7,90% | -0,14 | +15% | −24% | +21% / +9% |
| Kaplumbağa 1 · 20 / 10 (kıyas) | short | yok | 2860 | -0,02 | +0,06 | -0,08 | -0,07 | -0,3 | %40 | -0,53% | -0,15 | +7% | −16% | +7% / +6% |
| Kaplumbağa 1 · 20 / 10 (kıyas) | short | var | 1278 | +0,05 | +0,18 | -0,08 | +0,04 | +0,7 | %42 | +0,68% | -0,11 | +3% | −16% | +9% / -3% |

## Yıl yıl (portföy)

| Sistem | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Williams k = 0,5 (ilk kârlı açılış) · long | -73% | -88% | -97% | -96% | -96% | -94% | -82% |
| Williams k = 0,5 (ilk kârlı açılış) · long · süzgeç | -65% | -81% | +0% | -92% | -95% | -88% | -13% |
| Williams k = 0,5 (ilk kârlı açılış) · short | -69% | -90% | -82% | -94% | -92% | -90% | -85% |
| Williams k = 0,5 (ilk kârlı açılış) · short · süzgeç | +0% | -50% | -82% | -51% | -57% | -56% | -77% |
| Williams k = 0,3 (duyarlılık) · long | -63% | -77% | -96% | -89% | -93% | -90% | -63% |
| Williams k = 0,3 (duyarlılık) · long · süzgeç | -56% | -65% | +1% | -85% | -91% | -83% | -5% |
| Williams k = 0,3 (duyarlılık) · short | -53% | -85% | -58% | -88% | -84% | -73% | -75% |
| Williams k = 0,3 (duyarlılık) · short · süzgeç | +0% | -47% | -58% | -51% | -48% | -32% | -65% |
| Williams k = 0,7 (duyarlılık) · long | -86% | -98% | -99% | -99% | -99% | -98% | -95% |
| Williams k = 0,7 (duyarlılık) · long · süzgeç | -79% | -95% | +0% | -98% | -98% | -95% | -42% |
| Williams k = 0,7 (duyarlılık) · short | -81% | -95% | -95% | -98% | -97% | -95% | -94% |
| Williams k = 0,7 (duyarlılık) · short · süzgeç | +0% | -49% | -95% | -63% | -56% | -47% | -90% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) · long | +25% | +109% | -32% | +41% | +31% | +1% | +8% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) · long · süzgeç | +17% | +105% | +0% | +10% | +12% | +6% | +19% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) · short | -4% | -0% | +16% | +6% | +7% | +14% | +3% |
| 10 g kapanış kırılımı, 5 g dipte çık (#9) · short · süzgeç | +0% | +0% | +16% | +1% | -10% | +2% | +4% |
| 10 g / 10 g · long | +19% | +127% | -28% | +24% | +23% | -5% | +35% |
| 10 g / 10 g · long · süzgeç | +10% | +104% | +2% | -15% | +18% | +3% | +20% |
| 10 g / 10 g · short | -6% | -7% | +21% | +5% | -1% | +15% | +2% |
| 10 g / 10 g · short · süzgeç | +0% | -2% | +21% | +2% | -11% | +5% | +3% |
| Kaplumbağa 1 · 20 / 10 (kıyas) · long | +17% | +107% | -21% | +39% | +27% | -5% | +53% |
| Kaplumbağa 1 · 20 / 10 (kıyas) · long · süzgeç | +12% | +82% | -0% | -3% | +15% | -2% | +9% |
| Kaplumbağa 1 · 20 / 10 (kıyas) · short | -2% | -7% | +28% | +5% | -1% | +21% | +4% |
| Kaplumbağa 1 · 20 / 10 (kıyas) · short · süzgeç | +0% | -1% | +28% | +2% | -10% | -1% | +4% |

## Geçme (≥100 işlem, iki yarıda ve son 24 ayda R > 0, haftalık t ≥ 2, düşüş ≤ %35)

- 10 g kapanış kırılımı, 5 g dipte çık (#9) long: 4616 işlem, +0,15R, haftalık t +2,1, yıllık +22%, düşüş −32%
- 10 g kapanış kırılımı, 5 g dipte çık (#9) long · BTC süzgeci: 2833 işlem, +0,21R, haftalık t +2,3, yıllık +23%, düşüş −28%
- 10 g / 10 g long: 3606 işlem, +0,29R, haftalık t +2,3, yıllık +23%, düşüş −34%
- 10 g / 10 g long · BTC süzgeci: 2155 işlem, +0,37R, haftalık t +2,2, yıllık +18%, düşüş −27%
- Kaplumbağa 1 · 20 / 10 (kıyas) long: 2247 işlem, +0,54R, haftalık t +3,1, yıllık +29%, düşüş −22%
- Kaplumbağa 1 · 20 / 10 (kıyas) long · BTC süzgeci: 1403 işlem, +0,62R, haftalık t +3,2, yıllık +15%, düşüş −24%
