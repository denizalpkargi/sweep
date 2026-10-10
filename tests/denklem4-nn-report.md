# Denklem 4 · sinir ağı v3: derin gövde + coinler arası dikkat + sıralama kaybı + çok ufuk · 2026-10-09

874,999 saatlik gözlem (2023-06 → 2026-10), 274 değişken (eski 202 + 1 dk mikro yapı + çoklu pencere + coinler arası sıra). Hedefler: 1 / 4 / 12 / 24 sa VWAP → VWAP ÷ oynaklık. Ağ: artık MLP (d 320, 3 blok) → [2 katman coinler arası Transformer] → 4 çıkış; kayıp MSE + 1·(1 − saat içi Pearson); AdamW, tek döngü kosinüs, 5 tur, eğitim penceresinin son 60 günü doğrulama (en iyi tur). İleriye yürüyen test 6 ay, eğitimde en çok 16,000 saat. LightGBM (tümü) aynı bölünmelerde.

| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % |
|---|---|---|---|---|---|---|
| ağ derin tablo | 1 sa | tümü | 613,220 | +0,037 | +20,8 | +0,066 |
| ağ derin tablo | 1 sa | 1. yarı | 306,592 | +0,037 | +15,4 | +0,045 |
| ağ derin tablo | 1 sa | 2. yarı | 306,628 | +0,037 | +14,0 | +0,086 |
| ağ derin tablo | 1 sa | son 12 ay | 261,539 | +0,037 | +12,8 | +0,092 |
| ağ derin tablo | 4 sa | tümü | 613,220 | +0,038 | +21,7 | +0,209 |
| ağ derin tablo | 4 sa | 1. yarı | 306,592 | +0,039 | +16,9 | +0,125 |
| ağ derin tablo | 4 sa | 2. yarı | 306,628 | +0,037 | +14,0 | +0,288 |
| ağ derin tablo | 4 sa | son 12 ay | 261,539 | +0,037 | +12,5 | +0,315 |
| ağ derin tablo | 12 sa | tümü | 613,220 | +0,043 | +23,9 | +0,480 |
| ağ derin tablo | 12 sa | 1. yarı | 306,592 | +0,046 | +19,9 | +0,266 |
| ağ derin tablo | 12 sa | 2. yarı | 306,628 | +0,039 | +14,4 | +0,684 |
| ağ derin tablo | 12 sa | son 12 ay | 261,539 | +0,038 | +12,4 | +0,751 |
| ağ derin tablo | 24 sa | tümü | 613,220 | +0,048 | +27,3 | +0,878 |
| ağ derin tablo | 24 sa | 1. yarı | 306,592 | +0,053 | +22,7 | +0,488 |
| ağ derin tablo | 24 sa | 2. yarı | 306,628 | +0,043 | +16,3 | +1,249 |
| ağ derin tablo | 24 sa | son 12 ay | 261,539 | +0,040 | +13,9 | +1,299 |
| ağ coinler arası dikkat | 1 sa | tümü | 613,220 | +0,035 | +19,2 | +0,060 |
| ağ coinler arası dikkat | 1 sa | 1. yarı | 306,592 | +0,036 | +15,1 | +0,035 |
| ağ coinler arası dikkat | 1 sa | 2. yarı | 306,628 | +0,034 | +12,3 | +0,084 |
| ağ coinler arası dikkat | 1 sa | son 12 ay | 261,539 | +0,033 | +10,8 | +0,102 |
| ağ coinler arası dikkat | 4 sa | tümü | 613,220 | +0,035 | +19,0 | +0,161 |
| ağ coinler arası dikkat | 4 sa | 1. yarı | 306,592 | +0,034 | +14,4 | +0,078 |
| ağ coinler arası dikkat | 4 sa | 2. yarı | 306,628 | +0,035 | +12,6 | +0,240 |
| ağ coinler arası dikkat | 4 sa | son 12 ay | 261,539 | +0,036 | +11,7 | +0,316 |
| ağ coinler arası dikkat | 12 sa | tümü | 613,220 | +0,040 | +21,6 | +0,449 |
| ağ coinler arası dikkat | 12 sa | 1. yarı | 306,592 | +0,041 | +17,1 | +0,240 |
| ağ coinler arası dikkat | 12 sa | 2. yarı | 306,628 | +0,040 | +13,9 | +0,649 |
| ağ coinler arası dikkat | 12 sa | son 12 ay | 261,539 | +0,040 | +12,7 | +0,832 |
| ağ coinler arası dikkat | 24 sa | tümü | 613,220 | +0,047 | +25,7 | +0,724 |
| ağ coinler arası dikkat | 24 sa | 1. yarı | 306,592 | +0,045 | +19,3 | +0,322 |
| ağ coinler arası dikkat | 24 sa | 2. yarı | 306,628 | +0,050 | +17,5 | +1,108 |
| ağ coinler arası dikkat | 24 sa | son 12 ay | 261,539 | +0,047 | +14,8 | +1,366 |
| ağ dikkat ×2 topluluk | 1 sa | tümü | 613,220 | +0,038 | +20,0 | +0,061 |
| ağ dikkat ×2 topluluk | 1 sa | 1. yarı | 306,592 | +0,041 | +17,1 | +0,048 |
| ağ dikkat ×2 topluluk | 1 sa | 2. yarı | 306,628 | +0,034 | +11,7 | +0,073 |
| ağ dikkat ×2 topluluk | 1 sa | son 12 ay | 261,539 | +0,032 | +10,0 | +0,083 |
| ağ dikkat ×2 topluluk | 4 sa | tümü | 613,220 | +0,039 | +20,6 | +0,163 |
| ağ dikkat ×2 topluluk | 4 sa | 1. yarı | 306,592 | +0,042 | +17,2 | +0,105 |
| ağ dikkat ×2 topluluk | 4 sa | 2. yarı | 306,628 | +0,036 | +12,4 | +0,218 |
| ağ dikkat ×2 topluluk | 4 sa | son 12 ay | 261,539 | +0,035 | +10,7 | +0,277 |
| ağ dikkat ×2 topluluk | 12 sa | tümü | 613,220 | +0,043 | +22,3 | +0,389 |
| ağ dikkat ×2 topluluk | 12 sa | 1. yarı | 306,592 | +0,046 | +19,3 | +0,261 |
| ağ dikkat ×2 topluluk | 12 sa | 2. yarı | 306,628 | +0,040 | +13,1 | +0,509 |
| ağ dikkat ×2 topluluk | 12 sa | son 12 ay | 261,539 | +0,037 | +11,0 | +0,654 |
| ağ dikkat ×2 topluluk | 24 sa | tümü | 613,220 | +0,048 | +25,1 | +0,670 |
| ağ dikkat ×2 topluluk | 24 sa | 1. yarı | 306,592 | +0,050 | +21,4 | +0,399 |
| ağ dikkat ×2 topluluk | 24 sa | 2. yarı | 306,628 | +0,046 | +15,2 | +0,925 |
| ağ dikkat ×2 topluluk | 24 sa | son 12 ay | 261,539 | +0,041 | +12,0 | +1,123 |
| LightGBM tümü | 1 sa | tümü | 613,220 | +0,016 | +9,5 | +0,039 |
| LightGBM tümü | 1 sa | 1. yarı | 306,592 | +0,013 | +6,1 | +0,016 |
| LightGBM tümü | 1 sa | 2. yarı | 306,628 | +0,018 | +7,3 | +0,062 |
| LightGBM tümü | 1 sa | son 12 ay | 261,539 | +0,017 | +6,3 | +0,069 |
| LightGBM tümü | 4 sa | tümü | 613,220 | +0,005 | +3,1 | +0,138 |
| LightGBM tümü | 4 sa | 1. yarı | 306,592 | +0,010 | +4,6 | +0,061 |
| LightGBM tümü | 4 sa | 2. yarı | 306,628 | +0,000 | +0,1 | +0,211 |
| LightGBM tümü | 4 sa | son 12 ay | 261,539 | +0,000 | +0,1 | +0,253 |
| LightGBM tümü | 12 sa | tümü | 613,220 | +0,020 | +11,0 | +0,575 |
| LightGBM tümü | 12 sa | 1. yarı | 306,592 | +0,026 | +11,3 | +0,172 |
| LightGBM tümü | 12 sa | 2. yarı | 306,628 | +0,013 | +4,8 | +0,964 |
| LightGBM tümü | 12 sa | son 12 ay | 261,539 | +0,009 | +3,0 | +1,000 |
| LightGBM tümü | 24 sa | tümü | 613,220 | +0,027 | +15,1 | +1,079 |
| LightGBM tümü | 24 sa | 1. yarı | 306,592 | +0,027 | +11,5 | +0,396 |
| LightGBM tümü | 24 sa | 2. yarı | 306,628 | +0,027 | +10,1 | +1,735 |
| LightGBM tümü | 24 sa | son 12 ay | 261,539 | +0,021 | +7,0 | +1,961 |

## Gerçek işlem gibi: her ufukta en güçlü 2 long + 2 short (test içi %95/%5 eşiği, coin kilidi, VWAP dolum)

| Model | Ufuk | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası (%0,04) | Taker sonrası (%0,16) | Kazanma |
|---|---|---|---|---|---|---|---|
| ağ derin tablo | 1 sa | 1. yarı | 14,167 | +0,079 | +0,039 | -0,081 | %54.8 |
| ağ derin tablo | 1 sa | 2. yarı | 14,611 | +0,123 | +0,083 | -0,037 | %54.1 |
| ağ derin tablo | 1 sa | son 12 ay | 12,962 | +0,133 | +0,093 | -0,027 | %54.1 |
| ağ derin tablo | 4 sa | 1. yarı | 3,169 | +0,244 | +0,204 | +0,084 | %55.1 |
| ağ derin tablo | 4 sa | 2. yarı | 3,670 | +0,319 | +0,279 | +0,159 | %54.6 |
| ağ derin tablo | 4 sa | son 12 ay | 3,270 | +0,374 | +0,334 | +0,214 | %54.6 |
| ağ derin tablo | 12 sa | 1. yarı | 1,046 | +0,419 | +0,379 | +0,259 | %55.1 |
| ağ derin tablo | 12 sa | 2. yarı | 1,198 | +1,175 | +1,135 | +1,015 | %55.1 |
| ağ derin tablo | 12 sa | son 12 ay | 1,070 | +1,342 | +1,302 | +1,182 | %55.5 |
| ağ coinler arası dikkat | 1 sa | 1. yarı | 11,167 | +0,072 | +0,032 | -0,088 | %53.9 |
| ağ coinler arası dikkat | 1 sa | 2. yarı | 12,148 | +0,116 | +0,076 | -0,044 | %53.6 |
| ağ coinler arası dikkat | 1 sa | son 12 ay | 10,285 | +0,146 | +0,106 | -0,014 | %53.7 |
| ağ coinler arası dikkat | 4 sa | 1. yarı | 2,486 | +0,260 | +0,220 | +0,100 | %55.6 |
| ağ coinler arası dikkat | 4 sa | 2. yarı | 2,758 | +0,357 | +0,317 | +0,197 | %54.5 |
| ağ coinler arası dikkat | 4 sa | son 12 ay | 2,361 | +0,455 | +0,415 | +0,295 | %54.4 |
| ağ coinler arası dikkat | 12 sa | 1. yarı | 739 | +0,566 | +0,526 | +0,406 | %54.0 |
| ağ coinler arası dikkat | 12 sa | 2. yarı | 832 | +1,195 | +1,155 | +1,035 | %55.8 |
| ağ coinler arası dikkat | 12 sa | son 12 ay | 716 | +1,488 | +1,448 | +1,328 | %57.4 |
| ağ dikkat ×2 topluluk | 1 sa | 1. yarı | 10,966 | +0,109 | +0,069 | -0,051 | %55.2 |
| ağ dikkat ×2 topluluk | 1 sa | 2. yarı | 12,565 | +0,133 | +0,093 | -0,027 | %53.6 |
| ağ dikkat ×2 topluluk | 1 sa | son 12 ay | 10,680 | +0,167 | +0,127 | +0,007 | %53.6 |
| ağ dikkat ×2 topluluk | 4 sa | 1. yarı | 2,386 | +0,392 | +0,352 | +0,232 | %56.9 |
| ağ dikkat ×2 topluluk | 4 sa | 2. yarı | 2,813 | +0,314 | +0,274 | +0,154 | %54.6 |
| ağ dikkat ×2 topluluk | 4 sa | son 12 ay | 2,373 | +0,405 | +0,365 | +0,245 | %54.5 |
| ağ dikkat ×2 topluluk | 12 sa | 1. yarı | 721 | +0,800 | +0,760 | +0,640 | %55.2 |
| ağ dikkat ×2 topluluk | 12 sa | 2. yarı | 861 | +0,853 | +0,813 | +0,693 | %52.7 |
| ağ dikkat ×2 topluluk | 12 sa | son 12 ay | 733 | +1,123 | +1,083 | +0,963 | %54.2 |
| LightGBM tümü | 1 sa | 1. yarı | 4,690 | +0,097 | +0,057 | -0,063 | %54.2 |
| LightGBM tümü | 1 sa | 2. yarı | 6,302 | +0,036 | -0,004 | -0,124 | %51.8 |
| LightGBM tümü | 1 sa | son 12 ay | 5,746 | +0,054 | +0,014 | -0,106 | %51.5 |
| LightGBM tümü | 4 sa | 1. yarı | 1,064 | +0,380 | +0,340 | +0,220 | %57.4 |
| LightGBM tümü | 4 sa | 2. yarı | 1,203 | +0,070 | +0,030 | -0,090 | %51.0 |
| LightGBM tümü | 4 sa | son 12 ay | 1,118 | +0,060 | +0,020 | -0,100 | %50.7 |
| LightGBM tümü | 12 sa | 1. yarı | 357 | +0,613 | +0,573 | +0,453 | %58.5 |
| LightGBM tümü | 12 sa | 2. yarı | 376 | +0,507 | +0,467 | +0,347 | %54.3 |
| LightGBM tümü | 12 sa | son 12 ay | 352 | +0,324 | +0,284 | +0,164 | %53.1 |

## Karar

IC (tümü): 1 sa: ağ derin tablo +0,037, ağ coinler arası dikkat +0,035, ağ dikkat ×2 topluluk +0,038, LightGBM tümü +0,016 · 4 sa: ağ derin tablo +0,038, ağ coinler arası dikkat +0,035, ağ dikkat ×2 topluluk +0,039, LightGBM tümü +0,005 · 12 sa: ağ derin tablo +0,043, ağ coinler arası dikkat +0,040, ağ dikkat ×2 topluluk +0,043, LightGBM tümü +0,020 · 24 sa: ağ derin tablo +0,048, ağ coinler arası dikkat +0,047, ağ dikkat ×2 topluluk +0,048, LightGBM tümü +0,027.

Son 12 ay: 1 sa: ağ derin tablo +0,037, ağ coinler arası dikkat +0,033, ağ dikkat ×2 topluluk +0,032, LightGBM tümü +0,017 · 4 sa: ağ derin tablo +0,037, ağ coinler arası dikkat +0,036, ağ dikkat ×2 topluluk +0,035, LightGBM tümü +0,000 · 12 sa: ağ derin tablo +0,038, ağ coinler arası dikkat +0,040, ağ dikkat ×2 topluluk +0,037, LightGBM tümü +0,009 · 24 sa: ağ derin tablo +0,040, ağ coinler arası dikkat +0,047, ağ dikkat ×2 topluluk +0,041, LightGBM tümü +0,021.

