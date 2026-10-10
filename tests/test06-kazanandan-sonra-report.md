# Test #6 · Turtle "kazanandan sonra atla" süzgeci masada

10 Ekim 2026 · `node tests/test06-kazanandan-sonra.js` (girdi `node tests/test16-iz-stop.js`)

## Ne yapıldı

Masa örneklerinde (ayın ilk 30 coini, 4 saatte bir iki yön) bugünkü giriş kuralını geçen 134.421 karar (2020-06-01 → 2026-10-08) bugünkü bot planıyla 15 dk mumlarda oynatıldı (market giriş, 1,5R'de yarısı + stop girişe, 3R'de %60 + iz, 8 sa; taker %0,05 + kayma %0,03, fonlama dahil). Her coinde işlemler çakışmasın diye önceki işlem bitmeden gelen sinyal alınmadı (38.341 karar), aynı anda iki yön geçtiyse puanı yüksek olan alındı (0). Kalan **96.080 işlem** kuramsal dizi.

Süzgeç Turtle'ın 20 günlük sistemindeki gibi kuramsal diziye bakar: bir işlem atlandığında onun sonucu da "önceki işlem" olarak sayılır. "coin": aynı coindeki bir önceki işlem; "coin+yön": aynı coin ve aynı yöndeki bir önceki işlem. Pencere: önceki işlem son 24 sa / 7 g içinde bitmişse ya da sınırsız. Ayna kural (kaybedenden sonra atla) aynı sayıda işlemi rastgele olmayan başka bir yoldan attığı için kıyas olarak verildi.

Kuramsal dizinin ortalaması: tümü -0,111R · 1. yarı -0,117R · 2. yarı -0,106R · son 24 ay -0,105R · son 12 ay -0,117R.

## Aynı coin · pencere sınırsız

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,115 (59.036) | -0,111 (30.270) | -0,119 (28.766) | -0,118 (18.139) | -0,125 (8.911) |
| atlanan (önceki kazanan) | -0,106 (37.044) | -0,128 (18.669) | -0,085 (18.375) | -0,084 (11.614) | -0,104 (5.591) |
| önceki kaybeden | -0,115 (58.719) | -0,112 (30.138) | -0,119 (28.581) | -0,118 (18.012) | -0,124 (8.841) |
| önceki yok / pencere dışı | -0,018 (317) | +0,161 (132) | -0,146 (185) | -0,113 (127) | -0,194 (70) |
| fark: alınan − kuramsal | -0,003 | +0,007 | -0,013 | -0,013 | -0,008 |
| t (atlanan − önceki kaybeden) | +1,1 | -1,4 | +3,1 | +2,4 | +1,0 |

## Aynı coin · pencere 24 sa

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,114 (62.553) | -0,110 (32.051) | -0,117 (30.502) | -0,114 (19.215) | -0,123 (9.419) |
| atlanan (önceki kazanan) | -0,107 (33.527) | -0,130 (16.888) | -0,084 (16.639) | -0,088 (10.538) | -0,105 (5.083) |
| önceki kaybeden | -0,116 (45.555) | -0,115 (23.494) | -0,116 (22.061) | -0,116 (13.898) | -0,119 (6.846) |
| önceki yok / pencere dışı | -0,108 (16.998) | -0,095 (8.557) | -0,121 (8.441) | -0,111 (5.317) | -0,133 (2.573) |
| fark: alınan − kuramsal | -0,002 | +0,007 | -0,012 | -0,009 | -0,006 |
| t (atlanan − önceki kaybeden) | +1,0 | -1,3 | +2,6 | +1,8 | +0,7 |

## Aynı coin · pencere 7 g

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,114 (59.127) | -0,111 (30.300) | -0,118 (28.827) | -0,118 (18.178) | -0,125 (8.925) |
| atlanan (önceki kazanan) | -0,107 (36.953) | -0,128 (18.639) | -0,086 (18.314) | -0,085 (11.575) | -0,103 (5.577) |
| önceki kaybeden | -0,115 (58.426) | -0,111 (30.021) | -0,119 (28.405) | -0,119 (17.904) | -0,123 (8.774) |
| önceki yok / pencere dışı | -0,051 (701) | -0,009 (279) | -0,078 (422) | -0,048 (274) | -0,235 (151) |
| fark: alınan − kuramsal | -0,003 | +0,007 | -0,013 | -0,013 | -0,008 |
| t (atlanan − önceki kaybeden) | +1,1 | -1,5 | +3,0 | +2,5 | +1,0 |

## Aynı coin + yön · pencere sınırsız

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,113 (59.095) | -0,109 (30.295) | -0,117 (28.800) | -0,118 (18.161) | -0,125 (8.924) |
| atlanan (önceki kazanan) | -0,109 (36.985) | -0,130 (18.644) | -0,087 (18.341) | -0,085 (11.592) | -0,103 (5.578) |
| önceki kaybeden | -0,114 (58.521) | -0,111 (30.041) | -0,117 (28.480) | -0,118 (17.948) | -0,123 (8.810) |
| önceki yok / pencere dışı | -0,027 (574) | +0,113 (254) | -0,138 (320) | -0,139 (213) | -0,268 (114) |
| fark: alınan − kuramsal | -0,002 | +0,008 | -0,012 | -0,013 | -0,008 |
| t (atlanan − önceki kaybeden) | +0,7 | -1,7 | +2,8 | +2,3 | +1,0 |

## Aynı coin + yön · pencere 24 sa

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,114 (62.872) | -0,110 (32.207) | -0,117 (30.665) | -0,114 (19.318) | -0,123 (9.468) |
| atlanan (önceki kazanan) | -0,107 (33.208) | -0,131 (16.732) | -0,084 (16.476) | -0,088 (10.435) | -0,104 (5.034) |
| önceki kaybeden | -0,114 (43.697) | -0,113 (22.542) | -0,114 (21.155) | -0,114 (13.319) | -0,116 (6.578) |
| önceki yok / pencere dışı | -0,113 (19.175) | -0,102 (9.665) | -0,125 (9.510) | -0,115 (5.999) | -0,140 (2.890) |
| fark: alınan − kuramsal | -0,002 | +0,007 | -0,012 | -0,009 | -0,007 |
| t (atlanan − önceki kaybeden) | +0,7 | -1,5 | +2,5 | +1,7 | +0,5 |

## Aynı coin + yön · pencere 7 g

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| alınan (önceki kazanan değil) | -0,113 (59.522) | -0,109 (30.494) | -0,117 (29.028) | -0,117 (18.296) | -0,125 (8.978) |
| atlanan (önceki kazanan) | -0,110 (36.558) | -0,131 (18.445) | -0,088 (18.113) | -0,086 (11.457) | -0,103 (5.524) |
| önceki kaybeden | -0,113 (56.398) | -0,110 (28.993) | -0,116 (27.405) | -0,117 (17.295) | -0,120 (8.504) |
| önceki yok / pencere dışı | -0,100 (3.124) | -0,078 (1.501) | -0,121 (1.623) | -0,113 (1.001) | -0,228 (474) |
| fark: alınan − kuramsal | -0,001 | +0,009 | -0,011 | -0,012 | -0,009 |
| t (atlanan − önceki kaybeden) | +0,5 | -1,9 | +2,6 | +2,2 | +0,9 |

## Yıl yıl (aynı coin, sınırsız pencere)

| yıl | işlem | kuramsal | önceki kazanan (atlanan) | önceki kaybeden | alınan − kuramsal |
|---|---:|---:|---:|---:|---:|
| 2020 | 8.838 | -0,144 | -0,184 (3.265) | -0,127 | +0,023 |
| 2021 | 15.984 | -0,083 | -0,094 (6.374) | -0,076 | +0,007 |
| 2022 | 15.860 | -0,117 | -0,118 (6.018) | -0,117 | +0,001 |
| 2023 | 14.259 | -0,137 | -0,128 (5.280) | -0,141 | -0,005 |
| 2024 | 14.990 | -0,104 | -0,097 (5.891) | -0,108 | -0,004 |
| 2025 | 15.161 | -0,091 | -0,056 (6.005) | -0,114 | -0,023 |
| 2026 | 10.988 | -0,122 | -0,105 (4.211) | -0,133 | -0,011 |

## Önceki işlemin sonucuna göre sonraki işlem (aynı coin, sınırsız)

| önceki R | işlem | sonraki ort. R | sonraki kazanma |
|---|---:|---:|---:|
| ≤ −0,9 (tam stop) | 48.638 | -0,115 | %38,9 |
| −0,9…0 | 10.081 | -0,117 | %37,4 |
| 0…1 | 10.544 | -0,104 | %38,4 |
| > 1 | 26.500 | -0,107 | %38,7 |

Kazanma tanımı R > 0 (maliyet ve fonlama sonrası).
