# Test #13 · `mom6h` faktörü (6 saatlik pencerede momentum)

10 Ekim 2026 · `python3 tests/test13-mom6h.py`

Evren: ayın ilk 30 coini (önceki 30 günün hacmi, delist dahil, TradFi hariç), 2022-01-01 → 2026-10-08, saat başı 1.245.333 gözlem, 296 coin. Değişkenler 15 dk kapanışlarından (t anında kapanmış mum): son 6 sa getirisi ve 4/8/12 × 6 sa getirisi (AdaptiveTrend'in 6 sa mumlarındaki L mumluk değişimi, kayan pencereyle), ayrıca üçünün 7 günlük 15 dk oynaklığıyla ölçeklenmiş ortalaması. Hedef sonraki mumun VWAP'ından 16 mum sonraki mumun VWAP'ına basit getiri (4 sa); ek ufuk 24 sa. Kapanıştan kapanışa ölçülmedi.

IC = saat içi coinler arası Spearman, saatlerin ortalaması; t günlük ortalamalardan Newey–West (3 gecikme). Havuz = bütün (coin, saat) çiftlerinde tek Spearman (piyasa yönünü de içerir). Beşlik farkı = saat içi en yüksek beşte bir − en düşük beşte bir, 4 sa getirisi ortalaması (maliyetsiz; 2+2 taker gidiş-dönüş %0,16).

## Ufuk 4 sa

| değişken | IC 1. yarı | IC 2. yarı | IC son 12 ay | havuz 1. yarı | havuz 2. yarı | havuz son 12 ay | üst−alt 1. yarı | üst−alt 2. yarı | üst−alt son 12 ay |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| son 6 sa | -0,040 (t -12,4) | -0,028 (t -8,8) | -0,030 (t -6,3) | -0,052 | -0,028 | -0,032 | +0,010 % | +0,008 % | +0,052 % |
| 4 × 6 sa (24 sa) | -0,032 (t -9,9) | -0,022 (t -6,0) | -0,023 (t -4,3) | -0,054 | -0,034 | -0,034 | +0,018 % | +0,016 % | -0,004 % |
| 8 × 6 sa (48 sa) | -0,024 (t -7,0) | -0,013 (t -3,9) | -0,008 (t -1,5) | -0,029 | -0,017 | -0,014 | +0,031 % | +0,024 % | +0,029 % |
| 12 × 6 sa (72 sa) | -0,022 (t -6,4) | -0,012 (t -3,2) | +0,004 (t +0,9) | -0,019 | -0,025 | -0,019 | +0,038 % | +0,011 % | +0,079 % |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | -0,024 (t -7,2) | -0,017 (t -4,9) | -0,013 (t -2,3) | -0,034 | -0,028 | -0,029 | +0,047 % | +0,031 % | +0,050 % |

## Ufuk 24 sa

| değişken | IC 1. yarı | IC 2. yarı | IC son 12 ay | havuz 1. yarı | havuz 2. yarı | havuz son 12 ay | üst−alt 1. yarı | üst−alt 2. yarı | üst−alt son 12 ay |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| son 6 sa | -0,016 (t -4,5) | -0,017 (t -3,8) | -0,023 (t -3,8) | -0,038 | -0,024 | -0,025 | +0,035 % | +0,023 % | -0,083 % |
| 4 × 6 sa (24 sa) | -0,027 (t -4,4) | -0,014 (t -2,0) | -0,020 (t -2,0) | -0,058 | -0,019 | -0,021 | -0,054 % | +0,066 % | -0,151 % |
| 8 × 6 sa (48 sa) | -0,027 (t -3,6) | -0,017 (t -2,2) | -0,002 (t -0,1) | -0,021 | -0,023 | -0,024 | +0,049 % | +0,096 % | +0,219 % |
| 12 × 6 sa (72 sa) | -0,029 (t -3,8) | -0,015 (t -1,7) | +0,015 (t +1,3) | -0,012 | -0,037 | -0,022 | +0,017 % | +0,125 % | +0,490 % |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | -0,029 (t -4,0) | -0,016 (t -2,2) | -0,011 (t -1,0) | -0,023 | -0,030 | -0,036 | +0,030 % | +0,148 % | +0,147 % |

## Yıl yıl saat içi IC (4 sa)

| değişken | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|
| son 6 sa | -0,054 | -0,029 | -0,037 | -0,021 | -0,028 |
| 4 × 6 sa (24 sa) | -0,036 | -0,024 | -0,032 | -0,021 | -0,018 |
| 8 × 6 sa (48 sa) | -0,024 | -0,021 | -0,022 | -0,022 | -0,002 |
| 12 × 6 sa (72 sa) | -0,021 | -0,019 | -0,025 | -0,021 | +0,008 |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | -0,027 | -0,019 | -0,025 | -0,022 | -0,007 |

## Masa kararlarında (giriş kuralını geçenler: veto yok, puan ≥ 0,35, evet ≥ 3)

101.976 karar (2022-01-01 → 2026-10-08); değişken yönde işaretli (long için olduğu gibi, short için eksi). R = botun planı (fonlamasız, örnekteki), y = 4 sa'te önce +1 ATR (tahmin defteri ölçüsü). Beşlik sınırları tüm dönemden.

| değişken | dönem | B1 R | B2 R | B3 R | B4 R | B5 R | Spearman(değişken, R) | B5 − B1 R | B5 y / taban y |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| son 6 sa | 1. yarı | -0,137 | -0,113 | -0,117 | -0,114 | -0,110 | +0,007 | +0,027 | %47,9 / %48,9 |
| son 6 sa | 2. yarı | -0,129 | -0,114 | -0,108 | -0,077 | -0,081 | +0,015 | +0,048 | %50,4 / %50,0 |
| son 6 sa | son 12 ay | -0,087 | -0,134 | -0,136 | -0,089 | -0,114 | -0,010 | -0,028 | %50,1 / %49,4 |
| 4 × 6 sa (24 sa) | 1. yarı | -0,096 | -0,113 | -0,114 | -0,133 | -0,136 | -0,026 | -0,040 | %49,4 / %48,9 |
| 4 × 6 sa (24 sa) | 2. yarı | -0,114 | -0,116 | -0,113 | -0,106 | -0,058 | -0,001 | +0,056 | %50,4 / %50,0 |
| 4 × 6 sa (24 sa) | son 12 ay | -0,118 | -0,111 | -0,121 | -0,123 | -0,084 | -0,023 | +0,034 | %50,7 / %49,4 |
| 8 × 6 sa (48 sa) | 1. yarı | -0,159 | -0,105 | -0,091 | -0,117 | -0,122 | -0,006 | +0,038 | %48,6 / %48,8 |
| 8 × 6 sa (48 sa) | 2. yarı | -0,138 | -0,126 | -0,114 | -0,077 | -0,054 | +0,018 | +0,083 | %50,2 / %50,0 |
| 8 × 6 sa (48 sa) | son 12 ay | -0,139 | -0,137 | -0,134 | -0,107 | -0,039 | +0,005 | +0,100 | %49,5 / %49,4 |
| 12 × 6 sa (72 sa) | 1. yarı | -0,163 | -0,114 | -0,107 | -0,092 | -0,118 | +0,005 | +0,045 | %48,5 / %48,9 |
| 12 × 6 sa (72 sa) | 2. yarı | -0,121 | -0,116 | -0,122 | -0,092 | -0,057 | +0,014 | +0,064 | %49,7 / %50,0 |
| 12 × 6 sa (72 sa) | son 12 ay | -0,118 | -0,126 | -0,167 | -0,108 | -0,031 | +0,003 | +0,087 | %49,2 / %49,4 |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | 1. yarı | -0,148 | -0,113 | -0,089 | -0,143 | -0,099 | -0,001 | +0,049 | %49,3 / %48,9 |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | 2. yarı | -0,117 | -0,125 | -0,098 | -0,125 | -0,040 | +0,017 | +0,077 | %50,3 / %50,0 |
| 4/8/12 × 6 sa, oynaklıkla ölçekli ort. | son 12 ay | -0,113 | -0,135 | -0,106 | -0,141 | -0,065 | -0,005 | +0,048 | %49,6 / %49,4 |
