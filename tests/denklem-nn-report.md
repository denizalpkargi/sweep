# Denklem · sinir ağı ile tablo + ham dizi, VWAP hedefi · 2026-10-08

874,999 saatlik gözlem (2023-06 sonrası), 119 tablo değişkeni + son 32 mumun 7 kanalı. Hedef: sonraki mumun VWAP'ından 1 sa / 4 sa sonraki mumun VWAP'ına getiri ÷ oynaklık (gerçekçi dolum). İleriye yürüyen, test dönemi 6 ay, eğitim yalnız öncesi (en çok 600,000 satır örneklenir), ağ 3 tur. Üç model aynı bölünmelerde.

| Model | Dönem | n | IC 1 sa | t | IC 4 sa | t | Üst−alt onluk 1 sa % | Üst−alt onluk 4 sa % |
|---|---|---|---|---|---|---|---|---|
| ağ tablo | tümü | 613,220 | +0,013 | +7,4 | +0,014 | +8,1 | +0,042 | +0,094 |
| ağ tablo | 1. yarı | 306,592 | +0,016 | +7,4 | +0,016 | +7,3 | +0,023 | +0,037 |
| ağ tablo | 2. yarı | 306,628 | +0,009 | +3,4 | +0,012 | +4,4 | +0,059 | +0,149 |
| ağ tablo | son 12 ay | 261,539 | +0,008 | +2,8 | +0,010 | +3,6 | +0,071 | +0,188 |
| ağ tablo+dizi | tümü | 613,220 | +0,017 | +9,7 | +0,017 | +9,5 | +0,051 | +0,106 |
| ağ tablo+dizi | 1. yarı | 306,592 | +0,017 | +7,6 | +0,016 | +7,1 | +0,037 | +0,051 |
| ağ tablo+dizi | 2. yarı | 306,628 | +0,017 | +6,2 | +0,017 | +6,4 | +0,063 | +0,159 |
| ağ tablo+dizi | son 12 ay | 261,539 | +0,015 | +5,0 | +0,014 | +4,9 | +0,070 | +0,191 |
| LightGBM tablo | tümü | 613,220 | +0,022 | +13,5 | +0,014 | +8,5 | +0,067 | +0,167 |
| LightGBM tablo | 1. yarı | 306,592 | +0,022 | +9,8 | +0,019 | +8,4 | +0,045 | +0,081 |
| LightGBM tablo | 2. yarı | 306,628 | +0,022 | +9,4 | +0,010 | +3,8 | +0,087 | +0,248 |
| LightGBM tablo | son 12 ay | 261,539 | +0,022 | +8,3 | +0,010 | +3,5 | +0,101 | +0,279 |

## Seansa göre IC (1 sa, 1. yarı / 2. yarı)

| Model | Asya | Londra | New York | Gece |
|---|---|---|---|---|
| ağ tablo | +0,016 / +0,007 | +0,009 / +0,007 | +0,019 / +0,010 | +0,019 / +0,014 |
| ağ tablo+dizi | +0,018 / +0,012 | +0,023 / +0,012 | +0,018 / +0,019 | +0,006 / +0,028 |
| LightGBM tablo | +0,025 / +0,024 | +0,019 / +0,015 | +0,026 / +0,028 | +0,008 / +0,014 |

## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short (1 sa modeli, VWAP dolum, coin kilidi)

| Model | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası | Taker sonrası | Kazanma |
|---|---|---|---|---|---|---|
| ağ tablo | 1. yarı | 8,422 | +0,072 | +0,032 | -0,088 | %53.3 |
| ağ tablo | 2. yarı | 8,579 | +0,067 | +0,027 | -0,093 | %50.9 |
| ağ tablo | son 12 ay | 7,391 | +0,086 | +0,046 | -0,074 | %50.8 |
| ağ tablo+dizi | 1. yarı | 8,083 | +0,095 | +0,055 | -0,065 | %52.9 |
| ağ tablo+dizi | 2. yarı | 9,360 | +0,063 | +0,023 | -0,097 | %52.1 |
| ağ tablo+dizi | son 12 ay | 8,120 | +0,068 | +0,028 | -0,092 | %51.8 |
| LightGBM tablo | 1. yarı | 4,094 | +0,140 | +0,100 | -0,020 | %55.8 |
| LightGBM tablo | 2. yarı | 5,660 | +0,149 | +0,109 | -0,011 | %52.1 |
| LightGBM tablo | son 12 ay | 5,086 | +0,176 | +0,136 | +0,016 | %51.9 |

## Karar

En iyi IC: LightGBM tablo (+0,022). Dizi girdisinin tabloya katkısı: ağ tablo +0,013 → tablo+dizi +0,017; LightGBM +0,022. Üst−alt onluk 1 sa (iki bacak, maliyetsiz, maker iki bacak %0,08): ağ tablo +0,042% · ağ tablo+dizi +0,051% · LightGBM tablo +0,067%.

