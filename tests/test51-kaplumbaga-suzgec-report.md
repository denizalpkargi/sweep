# Test #51 · Kaplumbağa sepetinde BTC SMA200 süzgeci (canlı kod)

10 Ekim 2026 · `node tests/test51-kaplumbaga-suzgec.js`

Canlı `src/turtle.js` (ttClose / ttIntraday / ttExit), turtle-test.js --replay döngüsü: arşiv 1g, ayın ilk 50 coini, %0,5 risk, en çok 10 pozisyon, nominal ≤ 2x, taker %0,05 + kayma %0,03, fonlama yok. Özsermaye her gün piyasaya göre. "Süzgeç dışı girişler": BTC < SMA200 iken açılan işlemler.

| Varyant | İşlem | Ort. R | 1. yarı R | 2. yarı R | Son 24 ay R | İlk %5 hariç R | 100 $ → | Yıllık | 1. yarı / 2. yarı yıllık | Son 24 ay yıllık | En büyük düşüş | Süzgeç dışı girişler: n / R |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|
| bugünkü: BTC < SMA200 → giriş yok | 366 | +1,48 | +2,67 | +0,47 | +0,46 | -0,00 | 534 $ | +30% | +48% / +15% | +15% (düşüş −17%) | −29% | 0 / – |
| süzgeçsiz | 583 | +0,89 | +1,56 | +0,29 | +0,08 | -0,19 | 515 $ | +29% | +49% / +13% | +5% (düşüş −31%) | −33% | 253 / +0,09 |
| BTC < SMA200 → yarı risk | 583 | +0,89 | +1,56 | +0,29 | +0,08 | -0,19 | 508 $ | +29% | +47% / +13% | +8% (düşüş −26%) | −26% | 253 / +0,09 |

## Yıl yıl

| Varyant | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| bugünkü: BTC < SMA200 → giriş yok | +53% | +149% | -3% | +20% | +6% | -8% | +23% |
| süzgeçsiz | +49% | +188% | -26% | +59% | +5% | -11% | +8% |
| BTC < SMA200 → yarı risk | +49% | +170% | -15% | +39% | +6% | -11% | +12% |
