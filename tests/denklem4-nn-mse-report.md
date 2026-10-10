# Denklem 4 · sinir ağı v3: derin gövde + coinler arası dikkat + sıralama kaybı + çok ufuk · 2026-10-09

874,999 saatlik gözlem (2023-06 → 2026-10), 274 değişken (eski 202 + 1 dk mikro yapı + çoklu pencere + coinler arası sıra). Hedefler: 1 / 4 / 12 / 24 sa VWAP → VWAP ÷ oynaklık. Ağ: artık MLP (d 320, 3 blok) → [2 katman coinler arası Transformer] → 4 çıkış; kayıp MSE + 0·(1 − saat içi Pearson); AdamW, tek döngü kosinüs, 5 tur, eğitim penceresinin son 60 günü doğrulama (en iyi tur). İleriye yürüyen test 6 ay, eğitimde en çok 16,000 saat. LightGBM (tümü) aynı bölünmelerde.

| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % |
|---|---|---|---|---|---|---|
| ağ derin tablo | 1 sa | tümü | 613,220 | +0,021 | +12,1 | +0,035 |
| ağ derin tablo | 1 sa | 1. yarı | 306,592 | +0,020 | +9,1 | +0,013 |
| ağ derin tablo | 1 sa | 2. yarı | 306,628 | +0,022 | +8,3 | +0,056 |
| ağ derin tablo | 1 sa | son 12 ay | 261,539 | +0,020 | +6,5 | +0,063 |
| ağ derin tablo | 4 sa | tümü | 613,220 | +0,023 | +12,7 | +0,107 |
| ağ derin tablo | 4 sa | 1. yarı | 306,592 | +0,025 | +11,4 | +0,032 |
| ağ derin tablo | 4 sa | 2. yarı | 306,628 | +0,021 | +7,2 | +0,178 |
| ağ derin tablo | 4 sa | son 12 ay | 261,539 | +0,017 | +5,3 | +0,179 |
| ağ derin tablo | 12 sa | tümü | 613,220 | +0,026 | +14,0 | +0,304 |
| ağ derin tablo | 12 sa | 1. yarı | 306,592 | +0,029 | +13,1 | +0,112 |
| ağ derin tablo | 12 sa | 2. yarı | 306,628 | +0,022 | +7,5 | +0,487 |
| ağ derin tablo | 12 sa | son 12 ay | 261,539 | +0,018 | +5,5 | +0,494 |
| ağ derin tablo | 24 sa | tümü | 613,220 | +0,028 | +15,4 | +0,557 |
| ağ derin tablo | 24 sa | 1. yarı | 306,592 | +0,034 | +14,9 | +0,239 |
| ağ derin tablo | 24 sa | 2. yarı | 306,628 | +0,023 | +7,9 | +0,859 |
| ağ derin tablo | 24 sa | son 12 ay | 261,539 | +0,017 | +5,2 | +0,828 |

## Gerçek işlem gibi: her ufukta en güçlü 2 long + 2 short (test içi %95/%5 eşiği, coin kilidi, VWAP dolum)

| Model | Ufuk | Dönem | İşlem | Ort. % (maliyetsiz) | Maker sonrası (%0,04) | Taker sonrası (%0,16) | Kazanma |
|---|---|---|---|---|---|---|---|
| ağ derin tablo | 1 sa | 1. yarı | 10,663 | +0,041 | +0,001 | -0,119 | %53.4 |
| ağ derin tablo | 1 sa | 2. yarı | 10,650 | +0,049 | +0,009 | -0,111 | %51.8 |
| ağ derin tablo | 1 sa | son 12 ay | 9,625 | +0,064 | +0,024 | -0,096 | %52.1 |
| ağ derin tablo | 4 sa | 1. yarı | 2,334 | +0,211 | +0,171 | +0,051 | %55.4 |
| ağ derin tablo | 4 sa | 2. yarı | 2,546 | +0,216 | +0,176 | +0,056 | %51.9 |
| ağ derin tablo | 4 sa | son 12 ay | 2,311 | +0,265 | +0,225 | +0,105 | %52.7 |
| ağ derin tablo | 12 sa | 1. yarı | 807 | +0,500 | +0,460 | +0,340 | %55.6 |
| ağ derin tablo | 12 sa | 2. yarı | 877 | +0,408 | +0,368 | +0,248 | %51.8 |
| ağ derin tablo | 12 sa | son 12 ay | 789 | +0,488 | +0,448 | +0,328 | %53.1 |

## Karar

IC (tümü): 1 sa: ağ derin tablo +0,021 · 4 sa: ağ derin tablo +0,023 · 12 sa: ağ derin tablo +0,026 · 24 sa: ağ derin tablo +0,028.

Son 12 ay: 1 sa: ağ derin tablo +0,020 · 4 sa: ağ derin tablo +0,017 · 12 sa: ağ derin tablo +0,018 · 24 sa: ağ derin tablo +0,017.

