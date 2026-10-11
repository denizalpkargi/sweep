# Kerem, Yusuf, Onur · yeni değişkenlerle lambdarank · 2026-10-11

1.242.334 satır, 41.828 saat, ayın ilk 30 coini. Hedef rank-model.py ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk). Test 2024-06'dan 6 aylık pencereler, boşluk 2 gün, 200 ağaç. Kullanıcının PC'sinde koşuldu (`tests/uye-ek-pc.sh`, Python 383 sn). Değişkenler `tests/uye-ek-ozellik.js`.

| Üye | Değişken | Ufuk | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler |
|---|---|---|---|---|---|---|---|
| Emre (trend) | 12 | 4 sa | +0,031 | +0,039 | +0,023 | +0,020 | +0,035 / +0,038 / +0,040 / +0,021 / +0,019 |
| Emre (trend) | 12 | 12 sa | +0,041 | +0,053 | +0,028 | +0,024 | +0,045 / +0,052 / +0,056 / +0,023 / +0,023 |
| Kerem (likidite) | 13 | 4 sa | +0,025 | +0,024 | +0,025 | +0,027 | +0,028 / +0,018 / +0,025 / +0,032 / +0,018 |
| Kerem (likidite) | 13 | 12 sa | +0,025 | +0,031 | +0,019 | +0,023 | +0,026 / +0,032 / +0,022 / +0,027 / +0,016 |
| Yusuf (zaman dilimi) | 9 | 4 sa | +0,030 | +0,030 | +0,031 | +0,032 | +0,035 / +0,019 / +0,037 / +0,037 / +0,022 |
| Yusuf (zaman dilimi) | 9 | 12 sa | +0,036 | +0,035 | +0,037 | +0,035 | +0,031 / +0,036 / +0,046 / +0,034 / +0,032 |
| Onur (coin geçmişi) | 6 | 4 sa | +0,020 | +0,021 | +0,018 | +0,016 | +0,020 / +0,023 / +0,021 / +0,019 / +0,013 |
| Onur (coin geçmişi) | 6 | 12 sa | +0,021 | +0,025 | +0,018 | +0,011 | +0,027 / +0,028 / +0,024 / +0,019 / +0,003 |
| Ozan (hepsi) | 64 | 4 sa | +0,059 | +0,061 | +0,057 | +0,055 | +0,060 / +0,054 / +0,070 / +0,059 / +0,049 |
| Ozan (hepsi) | 64 | 12 sa | +0,070 | +0,079 | +0,060 | +0,056 | +0,069 / +0,076 / +0,089 / +0,057 / +0,050 |
| Ozan + üç üye | 92 | 4 sa | +0,060 | +0,064 | +0,056 | +0,054 | +0,063 / +0,058 / +0,071 / +0,057 / +0,047 |
| Ozan + üç üye | 92 | 12 sa | +0,070 | +0,082 | +0,058 | +0,056 | +0,073 / +0,079 / +0,085 / +0,054 / +0,055 |

## 4 sa: üye tahminlerinin benzerliği (saat içi sıra korelasyonu)

```
             Emre  Kerem Yusuf Onur  Ozan  Ozan+3
Emre         1.00  0.08  0.30  0.14  0.46  0.45
Kerem        0.08  1.00  0.26 -0.01  0.30  0.33
Yusuf        0.30  0.26  1.00  0.06  0.47  0.49
Onur         0.14 -0.01  0.06  1.00  0.13  0.18
Ozan         0.46  0.30  0.47  0.13  1.00  0.91
Ozan+3       0.45  0.33  0.49  0.18  0.91  1.00
```
Üç yeni üyenin sıra ortalaması IC +0,037; Ozan tek başına +0,059.

## 12 sa: üye tahminlerinin benzerliği (saat içi sıra korelasyonu)

```
             Emre  Kerem Yusuf Onur  Ozan  Ozan+3
Emre         1.00  0.06  0.30  0.14  0.52  0.52
Kerem        0.06  1.00  0.14 -0.00  0.18  0.21
Yusuf        0.30  0.14  1.00  0.05  0.38  0.41
Onur         0.14 -0.00  0.05  1.00  0.13  0.21
Ozan         0.52  0.18  0.38  0.13  1.00  0.88
Ozan+3       0.52  0.21  0.41  0.21  0.88  1.00
```
Üç yeni üyenin sıra ortalaması IC +0,042; Ozan tek başına +0,070.
