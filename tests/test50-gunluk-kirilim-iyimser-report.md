# Test #50 · Günlük kırılımlar: Williams (#4) ve 10/5 (#9)

10 Ekim 2026 · `node tests/test50-gunluk-kirilim.js`

Evren her ay hacimce ilk 50 coin (TradFi hariç, delist dahil), 2020-06 → 2026-10. Maliyet taraf başı %0,08 + arşiv fonlaması, basit getiri. R = getiri ÷ girişteki stop uzaklığı (Williams: önceki günün aralığı; Donchian: 2N). Williams'ta giriş günü dip stopa değdiyse stop sayıldı (kötümser). Portföy %0.5 risk, en çok 10 pozisyon, nominal ≤ 2x; özsermaye kapanan işlemlerle (düşüş alt sınır). "Haftalık t": haftalık R toplamları. "İlk %5 hariç": en iyi %5 işlem atılınca ort. R.

| Sistem | Yön | BTC SMA200 | İşlem | Ort. R | 1. yarı | 2. yarı | Son 24 ay | Haftalık t | Kazanma | % / işlem | İlk %5 hariç R | Yıllık | Düşüş | Yarılar yıllık |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Williams k = 0,5 (ilk kârlı açılış) | long | yok | 28700 | +0,01 | +0,01 | +0,02 | +0,02 | +0,9 | %62 | +0,10% | -0,12 | -65% | −100% | -66% / -64% |
| Williams k = 0,5 (ilk kârlı açılış) | long | var | 16490 | +0,02 | +0,03 | +0,01 | +0,03 | +1,0 | %62 | +0,12% | -0,11 | -41% | −97% | -35% / -46% |
| Williams k = 0,5 (ilk kârlı açılış) | short | yok | 30085 | +0,00 | +0,01 | -0,00 | +0,03 | +0,2 | %65 | -0,25% | -0,10 | -60% | −100% | -58% / -62% |
| Williams k = 0,5 (ilk kârlı açılış) | short | var | 12133 | +0,03 | +0,05 | +0,00 | +0,02 | +0,8 | %66 | +0,05% | -0,08 | -30% | −90% | -27% / -33% |
| Williams k = 0,3 (duyarlılık) | long | yok | 34936 | -0,00 | -0,00 | -0,00 | -0,00 | -0,2 | %63 | -0,02% | -0,12 | -70% | −100% | -70% / -71% |
| Williams k = 0,3 (duyarlılık) | long | var | 19996 | +0,01 | +0,02 | -0,01 | +0,01 | +0,3 | %63 | +0,00% | -0,12 | -47% | −99% | -37% / -55% |
| Williams k = 0,3 (duyarlılık) | short | yok | 36627 | +0,01 | +0,02 | -0,00 | +0,03 | +0,5 | %67 | -0,19% | -0,09 | -58% | −100% | -53% / -62% |
| Williams k = 0,3 (duyarlılık) | short | var | 14882 | +0,02 | +0,04 | -0,01 | +0,02 | +0,5 | %67 | -0,09% | -0,09 | -32% | −91% | -27% / -36% |
| Williams k = 0,7 (duyarlılık) | long | yok | 22704 | +0,02 | +0,02 | +0,03 | +0,03 | +1,3 | %61 | +0,16% | -0,12 | -58% | −100% | -57% / -58% |
| Williams k = 0,7 (duyarlılık) | long | var | 13209 | +0,02 | +0,02 | +0,02 | +0,04 | +0,8 | %60 | +0,11% | -0,12 | -38% | −97% | -31% / -44% |
| Williams k = 0,7 (duyarlılık) | short | yok | 23790 | +0,00 | -0,00 | +0,00 | +0,05 | +0,0 | %63 | -0,36% | -0,12 | -57% | −100% | -60% / -55% |
| Williams k = 0,7 (duyarlılık) | short | var | 9551 | +0,03 | +0,04 | +0,01 | +0,06 | +0,8 | %65 | -0,01% | -0,09 | -26% | −87% | -29% / -24% |
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
| Williams k = 0,5 (ilk kârlı açılış) · long | -28% | -28% | -86% | -63% | -75% | -67% | -45% |
| Williams k = 0,5 (ilk kârlı açılış) · long · süzgeç | -22% | -13% | +0% | -58% | -75% | -51% | +4% |
| Williams k = 0,5 (ilk kârlı açılış) · short | -42% | -67% | -31% | -76% | -70% | -47% | -39% |
| Williams k = 0,5 (ilk kârlı açılış) · short · süzgeç | +0% | -28% | -31% | -36% | -35% | -26% | -31% |
| Williams k = 0,3 (duyarlılık) · long | -29% | -32% | -90% | -69% | -80% | -75% | -42% |
| Williams k = 0,3 (duyarlılık) · long · süzgeç | -24% | -20% | +1% | -66% | -79% | -62% | +12% |
| Williams k = 0,3 (duyarlılık) · short | -35% | -69% | -19% | -75% | -67% | -46% | -42% |
| Williams k = 0,3 (duyarlılık) · short · süzgeç | +0% | -36% | -19% | -45% | -40% | -22% | -34% |
| Williams k = 0,7 (duyarlılık) · long | -9% | -13% | -79% | -63% | -63% | -70% | -37% |
| Williams k = 0,7 (duyarlılık) · long · süzgeç | -0% | -16% | +0% | -64% | -63% | -57% | +3% |
| Williams k = 0,7 (duyarlılık) · short | -39% | -69% | -42% | -79% | -66% | -19% | -35% |
| Williams k = 0,7 (duyarlılık) · short · süzgeç | +0% | -22% | -42% | -41% | -30% | -0% | -23% |
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
