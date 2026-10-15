# Diğer borsaların verisi ve Ozan (2026-10-15)

Ozan'ın örneklem dışı satırları (ayın ilk 30 coini, saatlik, 2024-06-01 → 2026-10-09, 612,444 satır). Coinbase'te olan coin: 110, Bybit'te olan: 207. IC: saat içi Spearman, değişken ile Ozan'ın hedefi (VWAP → VWAP, oynaklığa bölünmüş); en az 10 coinli saatler. "Ozan'dan arındırılmış": değişkenin saat içi sırasının Ozan sırasına göre kalıntısı. Kapsam = değişkenin dolu olduğu satır payı. Değişkenler betiğin başında tanımlı; Bybit serileri 1 saat, Binance metrics 5 dk gecikmeli alınır (yayın gecikmesi).

## 4 saat

| değişken | kapsam | IC tümü (t) | 1. yarı | 2. yarı | son 12 ay | Ozan'dan arındırılmış IC tümü (t) | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|---|---|---|
| cbp | %69 | +0,004 (+2,5) | +0,011 | -0,002 | -0,005 | +0,006 (+3,3) | +0,010 | +0,001 | -0,001 |
| cbp24 | %69 | -0,004 (-2,3) | -0,000 | -0,008 | -0,010 | -0,000 (-0,2) | +0,002 | -0,003 | -0,004 |
| cbpd | %69 | +0,009 (+5,4) | +0,013 | +0,005 | +0,003 | +0,008 (+5,0) | +0,012 | +0,005 | +0,004 |
| fspread | %96 | -0,002 (-1,5) | -0,004 | -0,001 | -0,000 | -0,002 (-1,5) | -0,004 | -0,000 | +0,001 |
| oi24d | %96 | +0,002 (+1,4) | +0,005 | -0,001 | +0,002 | +0,002 (+1,7) | +0,005 | -0,000 | +0,002 |
| boi24 | %96 | -0,001 (-0,9) | +0,001 | -0,003 | -0,000 | +0,000 (+0,1) | +0,003 | -0,003 | -0,000 |
| lsd | %96 | -0,013 (-8,0) | -0,011 | -0,014 | -0,013 | -0,008 (-5,5) | -0,007 | -0,010 | -0,008 |
| bls24 | %96 | +0,005 (+3,5) | +0,009 | +0,002 | +0,002 | +0,001 (+0,4) | +0,004 | -0,003 | -0,002 |

## 12 saat

| değişken | kapsam | IC tümü (t) | 1. yarı | 2. yarı | son 12 ay | Ozan'dan arındırılmış IC tümü (t) | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|---|---|---|
| cbp | %69 | +0,002 (+1,3) | +0,009 | -0,005 | -0,007 | +0,005 (+2,8) | +0,010 | -0,001 | -0,002 |
| cbp24 | %69 | -0,001 (-0,3) | +0,011 | -0,012 | -0,014 | +0,004 (+2,1) | +0,014 | -0,007 | -0,007 |
| cbpd | %69 | +0,007 (+4,2) | +0,007 | +0,007 | +0,004 | +0,006 (+3,8) | +0,006 | +0,007 | +0,005 |
| fspread | %96 | -0,004 (-2,5) | -0,009 | +0,002 | +0,003 | -0,002 (-1,6) | -0,008 | +0,003 | +0,005 |
| oi24d | %96 | +0,004 (+2,5) | +0,007 | -0,000 | +0,005 | +0,004 (+2,9) | +0,006 | +0,002 | +0,007 |
| boi24 | %96 | -0,005 (-3,3) | -0,004 | -0,005 | -0,002 | -0,003 (-1,8) | -0,001 | -0,004 | -0,001 |
| lsd | %96 | -0,016 (-9,7) | -0,013 | -0,019 | -0,015 | -0,013 (-8,4) | -0,012 | -0,014 | -0,009 |
| bls24 | %96 | +0,003 (+1,7) | +0,008 | -0,003 | -0,002 | -0,001 (-0,5) | +0,003 | -0,005 | -0,004 |

## Birleşim 4 saat: Ozan + w1 × (Bybit−Binance kalabalık farkının tersi) + w2 × (Coinbase primi değişimi)

İlk yarıda seçilen w1 0.1, w2 0.2; ayrıca seçimsiz w1 = w2 = 0,3. Alt onluk = en düşük sıralı %10'un ortalama hedefi (eksi = kötü coini iyi buluyor). 2+2 işlem taker + fonlama sonrası %.

| dönem | Ozan IC | seçili IC | 0,3/0,3 IC | Ozan alt onluk | seçili alt onluk | Ozan 2+2 % | seçili 2+2 % |
|---|---|---|---|---|---|---|---|
| tümü | +0,059 | +0,059 | +0,058 | -0,047 | -0,047 | -0,102 | -0,098 |
| 1. yarı | +0,061 | +0,061 | +0,060 | -0,035 | -0,034 | -0,112 | -0,118 |
| 2. yarı | +0,057 | +0,058 | +0,057 | -0,059 | -0,061 | -0,092 | -0,077 |
| son 12 ay | +0,055 | +0,055 | +0,054 | -0,060 | -0,061 | -0,091 | -0,080 |

## Birleşim 12 saat: Ozan + w1 × (Bybit−Binance kalabalık farkının tersi) + w2 × (Coinbase primi değişimi)

İlk yarıda seçilen w1 0.2, w2 0.1; ayrıca seçimsiz w1 = w2 = 0,3. Alt onluk = en düşük sıralı %10'un ortalama hedefi (eksi = kötü coini iyi buluyor). 2+2 işlem taker + fonlama sonrası %.

| dönem | Ozan IC | seçili IC | 0,3/0,3 IC | Ozan alt onluk | seçili alt onluk | Ozan 2+2 % | seçili 2+2 % |
|---|---|---|---|---|---|---|---|
| tümü | +0,070 | +0,071 | +0,069 | -0,082 | -0,075 | +0,034 | +0,014 |
| 1. yarı | +0,080 | +0,080 | +0,079 | -0,066 | -0,063 | +0,042 | +0,021 |
| 2. yarı | +0,060 | +0,061 | +0,060 | -0,098 | -0,087 | +0,025 | +0,008 |
| son 12 ay | +0,056 | +0,056 | +0,054 | -0,100 | -0,086 | +0,025 | -0,004 |

Okuma: aday = arındırılmış IC iki yarıda ve son 12 ayda aynı işaretli ve |t| ≥ 2. Ozan'ın kendi IC'si bu satırlarda 4 sa ≈ +0,058, 12 sa ≈ +0,068 (uye-birlesim-report.md); tek değişkenden beklenen katkı +0,005 civarıdır.