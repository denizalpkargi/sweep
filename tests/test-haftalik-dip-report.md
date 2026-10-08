# Test #18 · haftalık dip + hacim + kalabalık long → short, ve masada sakin saat süzgeci · 2026-10-08

## A) Kural gerçek işlem gibi

319 coin (ayın ilk 30'u), 1.702.521 saat başı, 2020-02 → 2026-10. Eşikler yalnız ilk yarıdan: 7 gün aralıkta yer ≤ 0,14, 1 sa hacim / 30 gün ≥ 1,31, tüm hesaplar long/short z ≥ 0,86. Short, giriş sonraki mumun açılışı, gidiş-dönüş %0,16 maliyet düşülmüş, aynı coinde açık işlem varken yeni sinyal yok. Ana ayar: stop 2 × 4 sa oynaklık, 24 sa tutuş (önceden seçildi, sonuca bakılmadan).

| Deneme | İşlem | Kazanma | 1. yarı (n · ort. % · R) | 2. yarı | Son 12 ay | En iyi %5 hariç R | Farklı gün |
|---|---|---|---|---|---|---|---|
| Ana: kural, stop 2σ, 24 sa | 4238 | %43 | 1559 · 0,54% · 0,13R | 2679 · -0,07% · -0,05R | 689 · 0,54% · 0,02R | -0,17R | 965 |
| Basamak: yalnız haftalık dip | 17015 | %43 | 7845 · -0,14% · -0,00R | 9170 · 0,02% · -0,01R | 3344 · 0,27% · 0,01R | -0,17R | 1858 |
| Basamak: dip + hacim | 9752 | %41 | 4689 · -0,24% · -0,01R | 5063 · -0,15% · -0,05R | 1698 · 0,11% · -0,02R | -0,21R | 1397 |
| Basamak: dip + kalabalık long | 7774 | %45 | 2998 · 0,42% · 0,10R | 4776 · 0,16% · 0,00R | 1286 · 0,58% · 0,04R | -0,12R | 1369 |
| Kural, stop 1,5σ, 24 sa | 4398 | %39 | 1603 · 0,61% · 0,18R | 2795 · -0,05% · -0,06R | 731 · 0,57% · 0,03R | -0,21R | 974 |
| Kural, stop 3σ, 24 sa | 4116 | %45 | 1521 · 0,52% · 0,07R | 2595 · -0,07% · -0,03R | 665 · 0,36% · 0,01R | -0,11R | 960 |
| Kural, stop 2σ, 4 sa | 6693 | %41 | 2489 · 0,11% · 0,00R | 4204 · -0,09% · -0,04R | 1095 · 0,19% · -0,01R | -0,12R | 1029 |
| Kural, stop 2σ, 48 sa | 3579 | %42 | 1306 · 0,64% · 0,16R | 2273 · 0,15% · 0,00R | 591 · 0,84% · 0,08R | -0,16R | 898 |
| Plasebo: her saat short (aynı stop/süre) | 74324 | %46 | 37258 · -0,30% · -0,06R | 37066 · -0,14% · -0,04R | 11162 · 0,04% · -0,01R | -0,18R | 2440 |
| Ters: kural ama long | 5523 | %42 | 2072 · -0,73% · -0,16R | 3451 · -0,37% · -0,10R | 881 · -0,32% · -0,13R | -0,28R | 976 |

Ana denemenin yılları: 2020 3 işlem 0,96R · 2021 98 işlem 0,05R · 2022 989 işlem 0,15R · 2023 908 işlem -0,04R · 2024 839 işlem 0,03R · 2025 889 işlem -0,08R · 2026 512 işlem -0,04R.
Stopla kapanan: 1417 / 4238. En iyi 5 işlem: LUNAUSDT 2022-05-09 11,97R, MATICUSDT 2023-06-09 11,33R, LUNAUSDT 2022-05-10 9,44R, SOLUSDT 2023-06-09 8,51R, AVAXUSDT 2023-06-10 7,63R.
Gün başına tek oy (aynı gün işlemlerinin ortalaması): 1. yarı -0,02R (339 gün) · 2. yarı -0,12R (626 gün) · son 12 ay -0,02R (195 gün).

## B) Masa kararları ve sakin saat
Bugünkü giriş kuralını geçen 134.392 arşiv kararı (veto yok, puan ≥ 35, evet ≥ 3). Beşlik sınırları ilk yarıdan. Hücre: karar sayısı · ortalama R.

**son 4 sa aralık / 30 gün ortalaması** (sınırlar 0,64 / 0,80 / 0,98 / 1,25)

| Beşlik | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|
| 1 (en sakin) | 13438 · -0,10 | 14461 · -0,08 | 5696 · -0,06 |
| 2 | 13439 · -0,10 | 12776 · -0,13 | 3751 · -0,15 |
| 3 | 13438 · -0,13 | 12691 · -0,12 | 3636 · -0,17 |
| 4 | 13439 · -0,13 | 12885 · -0,09 | 3664 · -0,16 |
| 5 (en hareketli) | 13439 · -0,12 | 14386 · -0,09 | 4339 · -0,06 |

Sakin beşliği atlarsak: 1. yarı -0,12 → -0,12R · 2. yarı -0,10 → -0,11R · son 12 ay -0,11 → -0,13R.

**son 1 sa hacim / 30 gün ortalaması** (sınırlar 0,56 / 0,74 / 0,97 / 1,40)

| Beşlik | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|
| 1 (en sakin) | 13432 · -0,11 | 14216 · -0,09 | 4705 · -0,08 |
| 2 | 13444 · -0,13 | 12572 · -0,10 | 3895 · -0,12 |
| 3 | 13435 · -0,11 | 12398 · -0,10 | 3771 · -0,10 |
| 4 | 13443 · -0,12 | 13324 · -0,11 | 4035 · -0,12 |
| 5 (en hareketli) | 13439 · -0,10 | 14689 · -0,10 | 4680 · -0,14 |

Sakin beşliği atlarsak: 1. yarı -0,12 → -0,12R · 2. yarı -0,10 → -0,10R · son 12 ay -0,11 → -0,12R.

