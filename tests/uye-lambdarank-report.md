# Masa üyeleri Ozan gibi · lambdarank, üye alanlarına bölünmüş değişkenler · 2026-10-11

1.242.334 satır, 41.828 saat, ayın ilk 30 coini. Hedef rank-model.py ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk). Test 2024-06'dan 6 aylık pencereler, boşluk 2 gün, 200 ağaç. Kullanıcının PC'sinde koşuldu (`tests/uye-lambdarank-pc.sh`, 407 sn).

| Üye | Değişken | Ufuk | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler |
|---|---|---|---|---|---|---|---|
| Emre (trend) | 12 | 4 sa | +0,031 | +0,039 | +0,023 | +0,020 | +0,035 / +0,038 / +0,040 / +0,021 / +0,019 |
| Emre (trend) | 12 | 12 sa | +0,041 | +0,053 | +0,028 | +0,024 | +0,045 / +0,052 / +0,056 / +0,023 / +0,023 |
| Baran (kısa momentum) | 16 | 4 sa | +0,042 | +0,040 | +0,044 | +0,046 | +0,040 / +0,031 / +0,045 / +0,053 / +0,040 |
| Baran (kısa momentum) | 16 | 12 sa | +0,043 | +0,043 | +0,043 | +0,042 | +0,033 / +0,039 / +0,059 / +0,046 / +0,035 |
| Serkan (hacim) | 10 | 4 sa | +0,043 | +0,043 | +0,043 | +0,042 | +0,039 / +0,034 / +0,058 / +0,044 / +0,038 |
| Serkan (hacim) | 10 | 12 sa | +0,044 | +0,045 | +0,043 | +0,039 | +0,033 / +0,040 / +0,069 / +0,037 / +0,038 |
| Mert (akış, OI, fonlama) | 15 | 4 sa | +0,035 | +0,031 | +0,039 | +0,039 | +0,022 / +0,038 / +0,039 / +0,038 / +0,042 |
| Mert (akış, OI, fonlama) | 15 | 12 sa | +0,042 | +0,037 | +0,047 | +0,047 | +0,016 / +0,051 / +0,051 / +0,039 / +0,057 |
| Arda (BTC'ye göre) | 5 | 4 sa | +0,050 | +0,054 | +0,045 | +0,044 | +0,058 / +0,048 / +0,053 / +0,042 / +0,046 |
| Arda (BTC'ye göre) | 5 | 12 sa | +0,052 | +0,062 | +0,042 | +0,036 | +0,062 / +0,060 / +0,062 / +0,026 / +0,048 |
| Can (oynaklık) | 6 | 4 sa | +0,036 | +0,045 | +0,027 | +0,024 | +0,039 / +0,048 / +0,043 / +0,019 / +0,028 |
| Can (oynaklık) | 6 | 12 sa | +0,042 | +0,054 | +0,029 | +0,022 | +0,049 / +0,056 / +0,055 / +0,017 / +0,028 |
| Ozan (hepsi) | 64 | 4 sa | +0,059 | +0,061 | +0,057 | +0,055 | +0,060 / +0,054 / +0,070 / +0,059 / +0,049 |
| Ozan (hepsi) | 64 | 12 sa | +0,070 | +0,079 | +0,060 | +0,056 | +0,069 / +0,076 / +0,089 / +0,057 / +0,050 |

## 4 sa: üye tahminlerinin benzerliği (saat içi sıra korelasyonu)

```
             Emre  Baran Serkan Mert  Arda  Can   Ozan
Emre         1.00  0.16  0.23   0.21  0.32  0.36  0.46
Baran        0.16  1.00  0.53   0.29  0.52  0.11  0.61
Serkan       0.23  0.53  1.00   0.28  0.50  0.24  0.65
Mert         0.21  0.29  0.28   1.00  0.41  0.35  0.48
Arda         0.32  0.52  0.50   0.41  1.00  0.48  0.71
Can          0.36  0.11  0.24   0.35  0.48  1.00  0.48
Ozan         0.46  0.61  0.65   0.48  0.71  0.48  1.00
```
Üyelerin sıra ortalaması (eşit ağırlık, masa gibi) IC +0,057; Ozan tek başına +0,059.

## 12 sa: üye tahminlerinin benzerliği (saat içi sıra korelasyonu)

```
             Emre  Baran Serkan Mert  Arda  Can   Ozan
Emre         1.00  0.14  0.23   0.18  0.31  0.30  0.52
Baran        0.14  1.00  0.36   0.18  0.36  0.14  0.41
Serkan       0.23  0.36  1.00   0.23  0.43  0.31  0.51
Mert         0.18  0.18  0.23   1.00  0.35  0.35  0.41
Arda         0.31  0.36  0.43   0.35  1.00  0.51  0.56
Can          0.30  0.14  0.31   0.35  0.51  1.00  0.50
Ozan         0.52  0.41  0.51   0.41  0.56  0.50  1.00
```
Üyelerin sıra ortalaması (eşit ağırlık, masa gibi) IC +0,064; Ozan tek başına +0,070.
