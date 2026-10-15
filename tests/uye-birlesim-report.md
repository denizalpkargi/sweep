# Ozan + eğitilmiş üyelerin birleşimi (2026-10-14)

Girdi: Ozan ve 8 eğitilmiş üyenin ileriye yürüyen örneklem dışı yüzdelik sıraları (uye-oos.csv, ayın ilk 30 coini, saatlik), hedef rank-model.py ile aynı (VWAP → VWAP, oynaklığa bölünmüş). Birleşimler: (a) 9 sıranın eşit ortalaması; (b) Ozan + w × 8 üyenin ortalaması, w ilk yarıda 0–3 arasından (0,25 adım) seçilir; (c) yığma: her ay başında yalnız iki gün öncesine kadarki verilerle hedefin 9 sıraya ridge regresyonu (ilk 6 ay yalnız eğitim), o ayın tahmini. Onluk sütunları: alt / üst onluğun ortalama hedefi (long yönü, oynaklık birimi; Ozan masada alt onluktaki longu veto eder). İşlem: her saat en üst 2 long, en alt 2 short, ufuk boyunca, basit getiri + fonlama, taker gidiş-dönüş %0,16 sonrası, işlem başı %.

## 4 saat

612,161 satır, 20,660 saat, saat başına 29.6 coin, 2024-06-01 → 2026-10-09. Ozan ile üyelerin sıra korelasyonu: Emre +0.39, Baran +0.56, Serkan +0.57, Mert +0.47, Arda +0.67, Can +0.47, Kerem +0.29, Yusuf +0.46. Üyeler arası ortalama +0.32. Seçilen w (ilk yarı) 0.5. Yığmanın son ayki göreli ağırlıkları: Ozan +0.47, Emre -0.06, Baran -0.01, Serkan -0.06, Mert +0.16, Arda +0.00, Can +0.03, Kerem -0.03, Yusuf -0.17.

| dönem | Ozan IC (t) | 9 eşit IC (t) | Ozan + w × üyeler IC | yığma IC (t) | Ozan alt / üst onluk | 9 eşit alt / üst | yığma alt / üst |
|---|---|---|---|---|---|---|---|
| 1. yarı | +0,063 (+27,8) | +0,059 (+25,1) | +0,064 | +0,053 (+17,8) | -0,041 / +0,015 | -0,037 / +0,003 | -0,033 / +0,005 |
| 2. yarı | +0,054 (+20,1) | +0,052 (+20,1) | +0,054 | +0,046 (+16,7) | -0,053 / -0,008 | -0,045 / -0,018 | -0,045 / -0,007 |
| son 12 ay | +0,052 (+17,4) | +0,051 (+17,7) | +0,052 | +0,044 (+14,6) | -0,054 / -0,014 | -0,052 / -0,023 | -0,048 / -0,012 |
| tümü | +0,058 (+33,3) | +0,056 (+31,8) | +0,059 | +0,048 (+23,6) | -0,047 / +0,003 | -0,041 / -0,007 | -0,041 / -0,003 |

| dönem | Ozan 2+2 long / short / ikisi % | 9 eşit long / short / ikisi % | yığma long / short / ikisi % | yığma satırlarında Ozan ikisi % |
|---|---|---|---|---|
| 1. yarı | -0,130 / -0,064 / -0,097 | -0,149 / -0,106 / -0,128 | -0,150 / -0,077 / -0,113 | -0,087 |
| 2. yarı | -0,158 / -0,082 / -0,120 | -0,185 / -0,114 / -0,150 | -0,138 / -0,076 / -0,107 | -0,120 |
| son 12 ay | -0,168 / -0,061 / -0,114 | -0,195 / -0,067 / -0,131 | -0,143 / -0,062 / -0,103 | -0,114 |
| tümü | -0,144 / -0,073 / -0,109 | -0,167 / -0,110 / -0,139 | -0,142 / -0,077 / -0,109 | -0,108 |

| üye | IC tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| Ozan | +0,058 | +0,063 | +0,054 | +0,052 |
| Emre | +0,027 | +0,035 | +0,019 | +0,018 |
| Baran | +0,041 | +0,041 | +0,042 | +0,044 |
| Serkan | +0,042 | +0,040 | +0,044 | +0,044 |
| Mert | +0,036 | +0,033 | +0,038 | +0,038 |
| Arda | +0,047 | +0,053 | +0,041 | +0,039 |
| Can | +0,035 | +0,044 | +0,025 | +0,021 |
| Kerem | +0,023 | +0,024 | +0,022 | +0,023 |
| Yusuf | +0,030 | +0,031 | +0,028 | +0,028 |

## 12 saat

611,913 satır, 20,652 saat, saat başına 29.6 coin, 2024-06-01 → 2026-10-09. Ozan ile üyelerin sıra korelasyonu: Emre +0.47, Baran +0.38, Serkan +0.50, Mert +0.42, Arda +0.57, Can +0.47, Kerem +0.20, Yusuf +0.41. Üyeler arası ortalama +0.31. Seçilen w (ilk yarı) 0.75. Yığmanın son ayki göreli ağırlıkları: Ozan +0.47, Emre -0.06, Baran -0.03, Serkan -0.06, Mert +0.15, Arda +0.03, Can -0.00, Kerem +0.02, Yusuf -0.18.

| dönem | Ozan IC (t) | 9 eşit IC (t) | Ozan + w × üyeler IC | yığma IC (t) | Ozan alt / üst onluk | 9 eşit alt / üst | yığma alt / üst |
|---|---|---|---|---|---|---|---|
| 1. yarı | +0,081 (+35,8) | +0,075 (+31,2) | +0,083 | +0,069 (+23,0) | -0,061 / +0,029 | -0,048 / +0,012 | -0,063 / +0,019 |
| 2. yarı | +0,056 (+21,8) | +0,057 (+21,2) | +0,058 | +0,047 (+18,7) | -0,105 / -0,020 | -0,077 / -0,031 | -0,070 / -0,023 |
| son 12 ay | +0,052 (+18,3) | +0,053 (+17,6) | +0,054 | +0,043 (+15,3) | -0,111 / -0,032 | -0,085 / -0,040 | -0,079 / -0,040 |
| tümü | +0,068 (+40,0) | +0,066 (+36,6) | +0,070 | +0,055 (+28,4) | -0,083 / +0,005 | -0,063 / -0,009 | -0,068 / -0,008 |

| dönem | Ozan 2+2 long / short / ikisi % | 9 eşit long / short / ikisi % | yığma long / short / ikisi % | yığma satırlarında Ozan ikisi % |
|---|---|---|---|---|
| 1. yarı | -0,007 / +0,058 / +0,026 | -0,119 / -0,048 / -0,084 | -0,073 / +0,064 / -0,005 | +0,179 |
| 2. yarı | -0,217 / +0,221 / +0,002 | -0,251 / -0,079 / -0,165 | -0,188 / +0,113 / -0,038 | +0,002 |
| son 12 ay | -0,261 / +0,294 / +0,016 | -0,274 / +0,050 / -0,112 | -0,244 / +0,177 / -0,034 | +0,016 |
| tümü | -0,112 / +0,140 / +0,014 | -0,185 / -0,064 / -0,124 | -0,146 / +0,095 / -0,025 | +0,067 |

| üye | IC tümü | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|
| Ozan | +0,068 | +0,081 | +0,056 | +0,052 |
| Emre | +0,039 | +0,055 | +0,024 | +0,019 |
| Baran | +0,043 | +0,047 | +0,040 | +0,041 |
| Serkan | +0,047 | +0,046 | +0,048 | +0,047 |
| Mert | +0,042 | +0,036 | +0,047 | +0,043 |
| Arda | +0,053 | +0,064 | +0,043 | +0,036 |
| Can | +0,042 | +0,056 | +0,029 | +0,021 |
| Kerem | +0,030 | +0,032 | +0,029 | +0,030 |
| Yusuf | +0,035 | +0,032 | +0,037 | +0,038 |

Not: yığmanın ilk 6 ayı (2024-06 → 2024-11) yalnız eğitim, o yüzden yığma sütunları 2024-12'den başlar; "yığma satırlarında Ozan" aynı satırlarda Ozan'ın sonucudur.