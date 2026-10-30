# Test #70 · Sepetler arası portföy oynaklık hedefi (arşiv, canlı kod)

12 Ekim 2026 · `node tests/test70-portfoy-oynaklik.js` · Kaplumbağa + Ichimoku, ayın ilk 50 coini, 2020-06-03 → 2026-10-09, yarı 2023-08-07. Kalite short sepeti yok (tahmin dosyaları bu ortamda yok). Çarpan = hedef ÷ son 20 g oynaklık, en çok 1,25, dünkü veriyle, değişim maliyeti %0,08.

Günlük getiri korelasyonu Ichimoku ↔ Kaplumbağa: -0,06.

| seri | boy | dönem | yıllık % | düşüş % | Sharpe | oynaklık % | ort. çarpan |
|---|---|---|---:|---:|---:|---:|---:|
| portföy (½ + ½) | sabit 1× | tümü | +39 | -19 | +1,91 | +18 | 1,00 |
| portföy (½ + ½) | sabit 1× | 1. yarı | +47 | -16 | +2,03 | +20 | 1,00 |
| portföy (½ + ½) | sabit 1× | 2. yarı | +32 | -13 | +1,79 | +16 | 1,00 |
| portföy (½ + ½) | sabit 1× | son 12 ay | +22 | -13 | +1,52 | +14 | 1,00 |
| portföy (½ + ½) | hedef %10 | tümü | +23 | -14 | +1,79 | +12 | 0,72 |
| portföy (½ + ½) | hedef %10 | 1. yarı | +26 | -10 | +1,99 | +12 | 0,68 |
| portföy (½ + ½) | hedef %10 | 2. yarı | +19 | -11 | +1,59 | +12 | 0,77 |
| portföy (½ + ½) | hedef %10 | son 12 ay | +15 | -11 | +1,32 | +11 | 0,92 |
| portföy (½ + ½) | hedef %15 | tümü | +32 | -18 | +1,84 | +16 | 0,98 |
| portföy (½ + ½) | hedef %15 | 1. yarı | +37 | -15 | +2,01 | +16 | 0,93 |
| portföy (½ + ½) | hedef %15 | 2. yarı | +28 | -15 | +1,67 | +16 | 1,03 |
| portföy (½ + ½) | hedef %15 | son 12 ay | +20 | -15 | +1,33 | +14 | 1,15 |
| portföy (½ + ½) | hedef %20 | tümü | +39 | -22 | +1,86 | +18 | 1,12 |
| portföy (½ + ½) | hedef %20 | 1. yarı | +42 | -18 | +1,96 | +19 | 1,08 |
| portföy (½ + ½) | hedef %20 | 2. yarı | +35 | -16 | +1,75 | +18 | 1,15 |
| portföy (½ + ½) | hedef %20 | son 12 ay | +23 | -16 | +1,40 | +16 | 1,19 |
| Kaplumbağa | sabit 1× | tümü | +30 | -29 | +1,09 | +27 | 1,00 |
| Kaplumbağa | sabit 1× | 1. yarı | +48 | -21 | +1,40 | +31 | 1,00 |
| Kaplumbağa | sabit 1× | 2. yarı | +14 | -29 | +0,69 | +22 | 1,00 |
| Kaplumbağa | sabit 1× | son 12 ay | +10 | -9 | +0,61 | +18 | 1,00 |
| Kaplumbağa | hedef %10 | tümü | +11 | -16 | +1,09 | +10 | 0,77 |
| Kaplumbağa | hedef %10 | 1. yarı | +16 | -6 | +1,53 | +10 | 0,74 |
| Kaplumbağa | hedef %10 | 2. yarı | +7 | -16 | +0,68 | +11 | 0,80 |
| Kaplumbağa | hedef %10 | son 12 ay | +3 | -7 | +0,38 | +9 | 1,07 |
| Kaplumbağa | hedef %15 | tümü | +14 | -24 | +1,03 | +14 | 0,89 |
| Kaplumbağa | hedef %15 | 1. yarı | +21 | -10 | +1,47 | +14 | 0,84 |
| Kaplumbağa | hedef %15 | 2. yarı | +8 | -24 | +0,61 | +14 | 0,93 |
| Kaplumbağa | hedef %15 | son 12 ay | +3 | -10 | +0,33 | +12 | 1,10 |
| Kaplumbağa | hedef %20 | tümü | +18 | -29 | +1,04 | +17 | 0,98 |
| Kaplumbağa | hedef %20 | 1. yarı | +26 | -15 | +1,41 | +17 | 0,92 |
| Kaplumbağa | hedef %20 | 2. yarı | +11 | -29 | +0,66 | +17 | 1,03 |
| Kaplumbağa | hedef %20 | son 12 ay | +5 | -11 | +0,41 | +14 | 1,13 |
| Ichimoku | sabit 1× | tümü | +44 | -26 | +1,55 | +26 | 1,00 |
| Ichimoku | sabit 1× | 1. yarı | +39 | -22 | +1,39 | +26 | 1,00 |
| Ichimoku | sabit 1× | 2. yarı | +48 | -24 | +1,72 | +25 | 1,00 |
| Ichimoku | sabit 1× | son 12 ay | +33 | -24 | +1,43 | +22 | 1,00 |
| Ichimoku | hedef %10 | tümü | +16 | -14 | +1,37 | +12 | 0,44 |
| Ichimoku | hedef %10 | 1. yarı | +14 | -12 | +1,20 | +12 | 0,43 |
| Ichimoku | hedef %10 | 2. yarı | +18 | -11 | +1,55 | +11 | 0,45 |
| Ichimoku | hedef %10 | son 12 ay | +13 | -11 | +1,23 | +11 | 0,49 |
| Ichimoku | hedef %15 | tümü | +26 | -21 | +1,40 | +17 | 0,65 |
| Ichimoku | hedef %15 | 1. yarı | +23 | -18 | +1,26 | +18 | 0,63 |
| Ichimoku | hedef %15 | 2. yarı | +28 | -16 | +1,55 | +17 | 0,67 |
| Ichimoku | hedef %15 | son 12 ay | +20 | -16 | +1,24 | +16 | 0,74 |
| Ichimoku | hedef %20 | tümü | +35 | -27 | +1,44 | +23 | 0,85 |
| Ichimoku | hedef %20 | 1. yarı | +31 | -23 | +1,30 | +23 | 0,82 |
| Ichimoku | hedef %20 | 2. yarı | +39 | -21 | +1,59 | +22 | 0,88 |
| Ichimoku | hedef %20 | son 12 ay | +29 | -21 | +1,32 | +21 | 0,97 |

Geçme (portföy; hedef iki yarıda ve son 12 ayda Sharpe'ı ve düşüşü sabit boydan iyi): **yok**.
