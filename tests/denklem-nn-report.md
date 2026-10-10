# Denklem · sinir ağı ile tablo + ham dizi, VWAP hedefi · 2026-10-08

874,999 saatlik gözlem (2023-06 sonrası), 194 tablo değişkeni + son 96 mumun 7 kanalı + son 168 saatin 3 kanalı (ikinci kol). Hedef: sonraki mumun VWAP'ından 1 sa / 4 sa sonraki mumun VWAP'ına getiri ÷ oynaklık (gerçekçi dolum). İleriye yürüyen, test dönemi 6 ay, eğitim yalnız öncesi (en çok 500,000 satır örneklenir), ağ 2 tur. Üç model aynı bölünmelerde.

| Model | Dönem | n | IC 1 sa | t | IC 4 sa | t | Üst−alt onluk 1 sa % | Üst−alt onluk 4 sa % |
|---|---|---|---|---|---|---|---|---|
| ağ tablo | tümü | 613,220 | +0,017 | +9,5 | +0,019 | +10,7 | +0,036 | +0,101 |
| ağ tablo | 1. yarı | 306,592 | +0,018 | +8,0 | +0,020 | +8,6 | +0,034 | +0,091 |
| ağ tablo | 2. yarı | 306,628 | +0,016 | +5,7 | +0,019 | +6,7 | +0,037 | +0,110 |
| ağ tablo | son 12 ay | 261,539 | +0,015 | +5,0 | +0,018 | +5,7 | +0,046 | +0,136 |
| ağ tablo+dizi | tümü | 613,220 | +0,017 | +9,4 | +0,019 | +10,5 | +0,038 | +0,095 |
| ağ tablo+dizi | 1. yarı | 306,592 | +0,018 | +7,9 | +0,019 | +8,0 | +0,029 | +0,069 |
| ağ tablo+dizi | 2. yarı | 306,628 | +0,016 | +5,6 | +0,020 | +6,9 | +0,047 | +0,120 |
| ağ tablo+dizi | son 12 ay | 261,539 | +0,014 | +4,6 | +0,019 | +6,0 | +0,057 | +0,148 |
| LightGBM tablo | tümü | 613,220 | +0,018 | +10,8 | +0,017 | +10,1 | +0,055 | +0,179 |
| LightGBM tablo | 1. yarı | 306,592 | +0,015 | +6,7 | +0,025 | +10,8 | +0,026 | +0,124 |
| LightGBM tablo | 2. yarı | 306,628 | +0,020 | +8,5 | +0,009 | +3,8 | +0,084 | +0,231 |
| LightGBM tablo | son 12 ay | 261,539 | +0,020 | +7,5 | +0,008 | +3,1 | +0,093 | +0,254 |
| LightGBM eski 127 | tümü | 613,220 | +0,021 | +12,7 | +0,014 | +8,5 | +0,061 | +0,151 |
| LightGBM eski 127 | 1. yarı | 306,592 | +0,022 | +9,7 | +0,019 | +8,1 | +0,043 | +0,083 |
| LightGBM eski 127 | 2. yarı | 306,628 | +0,020 | +8,3 | +0,010 | +4,0 | +0,078 | +0,216 |
| LightGBM eski 127 | son 12 ay | 261,539 | +0,019 | +7,0 | +0,010 | +3,6 | +0,088 | +0,251 |

## Seansa göre IC (1 sa, 1. yarı / 2. yarı)

| Model | Asya | Londra | New York | Gece |
|---|---|---|---|---|
| ağ tablo | +0,019 / +0,012 | +0,018 / +0,025 | +0,019 / +0,012 | +0,017 / +0,018 |
| ağ tablo+dizi | +0,017 / +0,014 | +0,017 / +0,018 | +0,019 / +0,012 | +0,021 / +0,027 |
| LightGBM tablo | +0,014 / +0,024 | +0,015 / +0,019 | +0,021 / +0,021 | +0,001 / +0,012 |
| LightGBM eski 127 | +0,024 / +0,022 | +0,019 / +0,017 | +0,026 / +0,024 | +0,009 / +0,006 |

## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short (1 sa modeli, VWAP dolum, coin kilidi)

| Model | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası | Taker sonrası | Kazanma |
|---|---|---|---|---|---|---|
| ağ tablo | 1. yarı | 9,876 | +0,064 | +0,024 | -0,096 | %53.0 |
| ağ tablo | 2. yarı | 7,807 | +0,088 | +0,048 | -0,072 | %52.5 |
| ağ tablo | son 12 ay | 6,507 | +0,102 | +0,062 | -0,058 | %52.3 |
| ağ tablo+dizi | 1. yarı | 9,975 | +0,073 | +0,033 | -0,087 | %52.9 |
| ağ tablo+dizi | 2. yarı | 8,167 | +0,041 | +0,001 | -0,119 | %52.1 |
| ağ tablo+dizi | son 12 ay | 6,541 | +0,061 | +0,021 | -0,099 | %52.4 |
| LightGBM tablo | 1. yarı | 5,958 | +0,119 | +0,079 | -0,041 | %53.9 |
| LightGBM tablo | 2. yarı | 6,494 | +0,139 | +0,099 | -0,021 | %52.6 |
| LightGBM tablo | son 12 ay | 4,320 | +0,196 | +0,156 | +0,036 | %52.7 |
| LightGBM eski 127 | 1. yarı | 4,085 | +0,134 | +0,094 | -0,026 | %55.6 |
| LightGBM eski 127 | 2. yarı | 5,868 | +0,099 | +0,059 | -0,061 | %52.6 |
| LightGBM eski 127 | son 12 ay | 5,265 | +0,124 | +0,084 | -0,036 | %52.4 |

## Karar

En iyi IC: LightGBM eski 127 (+0,021). Dizi girdisinin tabloya katkısı: ağ tablo +0,017 → tablo+dizi +0,017; LightGBM +0,018. Üst−alt onluk 1 sa (iki bacak, maliyetsiz, maker iki bacak %0,08): ağ tablo +0,036% · ağ tablo+dizi +0,038% · LightGBM tablo +0,055% · LightGBM eski 127 +0,061%.

