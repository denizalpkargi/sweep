# Denklem · ~100 değişkenle 15 dk/1 sa/4 sa yön modeli, seans ve etkileşimler · 2026-10-08

1,701,753 saatlik gözlem, 319 coin (ayın ilk 30'u), 2020-02 → 2026-10, 109 değişken (liste sonda). Hedef: sonraki 1 sa ve 4 sa getiri ÷ coinin 30 günlük oynaklığı (±5 kırpılmış). Model: LightGBM, ileriye yürüyen (her 6 ayda bir yalnız geçmişle yeniden eğitilir, ilk 12 ay yalnız eğitim). Bütün sayılar örneklem dışı.

**IC** = her saatte coinleri tahmine göre sıralayıp gerçek getiriyle Spearman ilişkisi, saatlerin ortalaması (0 = bilgi yok; 0,05 zayıf ama gerçek; 0,10 güçlü). t ≥ 3 anlamlı sayılır.

## 1 saat hedefi

| Dönem | n | Coinler arası IC | t | Havuz IC (aylık) | t |
|---|---|---|---|---|---|
| tümü | 1,483,459 | +0,079 | +79,7 | +0,096 | +13,6 |
| 1. yarı | 741,704 | +0,053 | +38,3 | +0,055 | +9,3 |
| 2. yarı | 741,755 | +0,105 | +74,7 | +0,135 | +16,1 |
| son 12 ay | 261,539 | +0,142 | +60,1 | +0,165 | +28,4 |

**Seansa göre** (ortak model, o seansın saatleri):

| Seans | 1. yarı IC | t | 2. yarı IC | t | son 12 ay IC | t |
|---|---|---|---|---|---|---|
| Asya 00–07 | +0,054 | +21,6 | +0,108 | +41,9 | +0,142 | +32,5 |
| Londra 07–12 | +0,051 | +17,2 | +0,106 | +34,7 | +0,146 | +29,5 |
| New York 12–21 | +0,052 | +22,9 | +0,103 | +44,4 | +0,139 | +35,4 |
| Gece 21–24 | +0,054 | +13,6 | +0,104 | +25,5 | +0,144 | +21,2 |

**Saate göre** (UTC; 1. yarı / 2. yarı IC):

00: +0,06 / +0,11 · 01: +0,05 / +0,10 · 02: +0,05 / +0,10 · 03: +0,06 / +0,10 · 04: +0,06 / +0,11 · 05: +0,06 / +0,11 · 06: +0,04 / +0,11 · 07: +0,05 / +0,11 · 08: +0,05 / +0,12 · 09: +0,05 / +0,11 · 10: +0,05 / +0,10 · 11: +0,06 / +0,10 · 12: +0,05 / +0,10 · 13: +0,06 / +0,10 · 14: +0,05 / +0,10 · 15: +0,05 / +0,09 · 16: +0,06 / +0,11 · 17: +0,05 / +0,11 · 18: +0,05 / +0,10 · 19: +0,04 / +0,11 · 20: +0,05 / +0,09 · 21: +0,05 / +0,10 · 22: +0,07 / +0,10 · 23: +0,04 / +0,11

**Güne göre** (Pzt…Paz; 1. yarı / 2. yarı IC):

Pzt: +0,05 / +0,11 · Sal: +0,05 / +0,10 · Çar: +0,04 / +0,11 · Per: +0,05 / +0,11 · Cum: +0,05 / +0,10 · Cmt: +0,06 / +0,11 · Paz: +0,06 / +0,11

**Onluklar** (her saat coinler tahmine göre 10 dilime; gerçek 1 saat getirisi %, maliyetsiz, yön long):

| Onluk | n | ort. % | kazanma | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| 1 (en düşük tahmin) | 142,692 | -0,109 | %45,8 | -0,063 | -0,157 | -0,251 |
| 2 | 149,184 | -0,066 | %46,6 | -0,036 | -0,097 | -0,168 |
| 3 | 149,160 | -0,043 | %47,6 | -0,022 | -0,064 | -0,103 |
| 4 | 149,060 | -0,030 | %48,2 | -0,014 | -0,046 | -0,083 |
| 5 | 149,160 | -0,014 | %48,9 | -0,010 | -0,018 | -0,025 |
| 6 | 147,639 | -0,003 | %49,5 | -0,005 | -0,001 | -0,017 |
| 7 | 149,012 | +0,012 | %50,1 | +0,003 | +0,021 | +0,028 |
| 8 | 149,208 | +0,030 | %50,9 | +0,014 | +0,046 | +0,069 |
| 9 | 149,136 | +0,051 | %51,6 | +0,023 | +0,078 | +0,122 |
| 10 (en yüksek) | 149,208 | +0,076 | %52,2 | +0,043 | +0,109 | +0,167 |

Üst onluk long − alt onluk short (saat başına, iki bacak toplamı %, maliyetsiz): 1. yarı +0,105% (t +15,4) · 2. yarı +0,267% (t +31,1) · son 12 ay +0,421% (t +21,4). Maliyet iki bacak için maker %0,08, taker %0,32.

En çok kullanılan girdiler (kazanç payı %): bVol 6.3, bPos24 6.3, b4 5.6, b24 5.4, b1 5.4, b15 5.3, bs200 5.1, bs50 5.1, bPrev1 4.6, breadth1 2.9, hr 2.7, minFund 2.4, breadth4 2.2, takerM 2.2, dom 2.0, vwapD 2.0, dRng 2.0, rng4 1.8, top10m4 1.6, dow 1.3, eth4 1.3, asiaRng 1.3, r15 1.2, sq 1.1, r4 1.1

## 4 saat hedefi

| Dönem | n | Coinler arası IC | t | Havuz IC (aylık) | t |
|---|---|---|---|---|---|
| tümü | 1,483,459 | +0,036 | +35,5 | +0,057 | +10,3 |
| 1. yarı | 741,704 | +0,031 | +21,8 | +0,047 | +5,4 |
| 2. yarı | 741,755 | +0,041 | +28,3 | +0,068 | +11,1 |
| son 12 ay | 261,539 | +0,053 | +20,7 | +0,056 | +8,6 |

**Seansa göre** (ortak model, o seansın saatleri):

| Seans | 1. yarı IC | t | 2. yarı IC | t | son 12 ay IC | t |
|---|---|---|---|---|---|---|
| Asya 00–07 | +0,024 | +9,3 | +0,051 | +19,1 | +0,067 | +14,7 |
| Londra 07–12 | +0,041 | +13,5 | +0,047 | +15,2 | +0,063 | +11,4 |
| New York 12–21 | +0,035 | +15,3 | +0,037 | +15,6 | +0,043 | +10,3 |
| Gece 21–24 | +0,016 | +3,8 | +0,019 | +4,6 | +0,029 | +4,0 |

**Saate göre** (UTC; 1. yarı / 2. yarı IC):

00: +0,03 / +0,05 · 01: +0,02 / +0,06 · 02: +0,03 / +0,05 · 03: +0,03 / +0,04 · 04: +0,03 / +0,05 · 05: +0,02 / +0,05 · 06: +0,02 / +0,05 · 07: +0,03 / +0,05 · 08: +0,03 / +0,06 · 09: +0,05 / +0,05 · 10: +0,04 / +0,05 · 11: +0,05 / +0,03 · 12: +0,04 / +0,04 · 13: +0,05 / +0,03 · 14: +0,04 / +0,04 · 15: +0,05 / +0,05 · 16: +0,05 / +0,06 · 17: +0,03 / +0,04 · 18: +0,03 / +0,03 · 19: +0,02 / +0,03 · 20: +0,01 / +0,01 · 21: +0,02 / +0,02 · 22: +0,02 / +0,02 · 23: +0,01 / +0,02

**Güne göre** (Pzt…Paz; 1. yarı / 2. yarı IC):

Pzt: +0,03 / +0,05 · Sal: +0,04 / +0,04 · Çar: +0,03 / +0,05 · Per: +0,03 / +0,04 · Cum: +0,03 / +0,03 · Cmt: +0,02 / +0,03 · Paz: +0,04 / +0,05

**Onluklar** (her saat coinler tahmine göre 10 dilime; gerçek 4 saat getirisi %, maliyetsiz, yön long):

| Onluk | n | ort. % | kazanma | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| 1 (en düşük tahmin) | 142,692 | -0,186 | %47,4 | -0,111 | -0,263 | -0,490 |
| 2 | 149,184 | -0,100 | %48,0 | -0,078 | -0,123 | -0,197 |
| 3 | 149,160 | -0,067 | %48,4 | -0,062 | -0,073 | -0,142 |
| 4 | 149,060 | -0,052 | %48,7 | -0,034 | -0,070 | -0,117 |
| 5 | 149,160 | -0,042 | %48,7 | -0,044 | -0,041 | -0,101 |
| 6 | 147,639 | -0,011 | %49,2 | -0,009 | -0,013 | -0,039 |
| 7 | 149,012 | -0,013 | %49,6 | -0,017 | -0,009 | -0,029 |
| 8 | 149,208 | +0,014 | %49,6 | +0,012 | +0,015 | -0,001 |
| 9 | 149,136 | +0,029 | %49,7 | +0,030 | +0,028 | +0,029 |
| 10 (en yüksek) | 149,208 | +0,050 | %49,8 | +0,048 | +0,052 | +0,060 |

Üst onluk long − alt onluk short (saat başına, iki bacak toplamı %, maliyetsiz): 1. yarı +0,158% (t +12,4) · 2. yarı +0,320% (t +17,2) · son 12 ay +0,560% (t +12,5). Maliyet iki bacak için maker %0,08, taker %0,32.

En çok kullanılan girdiler (kazanç payı %): bVol 10.3, bs50 9.0, bs200 8.9, b24 6.6, dom 6.5, bPos24 4.1, dow 3.4, b4 3.3, hr 3.3, b1 2.3, asiaPos 1.9, sinceLo30 1.7, asiaRng 1.6, breadth4 1.6, b15 1.6, bPrev1 1.4, sq 1.4, dOpen 1.3, r24 1.3, wkOpen 1.2, top10m4 1.1, pdh 1.1, dRng 1.1, eth4 1.1, vwapD 1.1

## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short

Tahmin eğitim dağılımının üst %5 / alt %5 eşiğini geçmeli; coin başına tek açık işlem; giriş saat kapanışı, çıkış 1 sa (ya da 4 sa) sonra kapanış; maliyet gidiş-dönüş maker %0,04, taker %0,16.

| Tutuş | Yön | İşlem | Kazanma (maliyetsiz) | 1. yarı ort. % (taker / maker) | 2. yarı | son 12 ay | Günde işlem |
|---|---|---|---|---|---|---|---|
| 1 sa | long | 20,916 | %58,4 | +0,032 / +0,152 (n 6,200) | +0,074 / +0,194 (n 14,716) | +0,086 / +0,206 (n 7,611) | 12.0 |
| 1 sa | short | 31,033 | %56,6 | -0,026 / +0,094 (n 8,203) | +0,136 / +0,256 (n 22,830) | +0,177 / +0,297 (n 11,738) | 16.6 |
| 1 sa | ikisi | 51,949 | %57,3 | -0,001 / +0,119 (n 14,403) | +0,112 / +0,232 (n 37,546) | +0,141 / +0,261 (n 19,349) | 25.9 |
| 4 sa | long | 16,317 | %55,2 | +0,071 / +0,191 (n 4,789) | +0,068 / +0,188 (n 11,528) | +0,003 / +0,123 (n 5,902) | 9.4 |
| 4 sa | short | 22,848 | %54,4 | -0,022 / +0,098 (n 5,750) | +0,172 / +0,292 (n 17,098) | +0,245 / +0,365 (n 8,724) | 12.3 |
| 4 sa | ikisi | 36,178 | %54,6 | +0,036 / +0,156 (n 10,283) | +0,134 / +0,254 (n 25,895) | +0,152 / +0,272 (n 12,966) | 18.0 |

## Seansa özel modeller (yalnız o seansın verisiyle eğitilen) ile ortak model

| Seans | Ortak model IC (1. / 2. yarı) | Seans modeli IC (1. / 2. yarı) |
|---|---|---|
| Asya 00–07 | +0,054 / +0,108 | +0,046 / +0,101 |
| Londra 07–12 | +0,051 / +0,106 | +0,043 / +0,090 |
| New York 12–21 | +0,052 / +0,103 | +0,038 / +0,098 |
| Gece 21–24 | +0,054 / +0,104 | +0,042 / +0,090 |

## Tek değişken, seansa göre (ham, modelsiz)

Her değişkenin 1 sa hedefiyle coinler arası IC'si, seans seans. Yalnız iki yarıda da aynı işaretli ve |IC| ≥ 0,02 olanlar (toplam 4 × 109 deneme; şans eseri birkaçı geçer).

| Değişken | Seans | 1. yarı | 2. yarı | son 12 ay | Tüm seanslar 1. / 2. yarı |
|---|---|---|---|---|---|
| bb | Gece 21–24 | -0,098 | -0,051 | -0,056 | -0,072 / -0,032 |
| r4 | Gece 21–24 | -0,097 | -0,050 | -0,058 | -0,065 / -0,030 |
| vwapD | Gece 21–24 | -0,078 | -0,049 | -0,063 | -0,064 / -0,028 |
| r1 | Gece 21–24 | -0,094 | -0,048 | -0,052 | -0,075 / -0,032 |
| hi7 | Gece 21–24 | -0,045 | -0,057 | -0,061 | -0,036 / -0,026 |
| rsi | Gece 21–24 | -0,086 | -0,042 | -0,053 | -0,057 / -0,028 |
| rel4 | Gece 21–24 | -0,090 | -0,041 | -0,048 | -0,064 / -0,028 |
| xs1 | Gece 21–24 | -0,087 | -0,039 | -0,044 | -0,071 / -0,027 |
| bb | Asya 00–07 | -0,080 | -0,036 | -0,028 | -0,072 / -0,032 |
| pos24 | Gece 21–24 | -0,069 | -0,035 | -0,047 | -0,053 / -0,023 |
| dOpen | Asya 00–07 | -0,075 | -0,034 | -0,024 | -0,052 / -0,023 |
| xs4 | Gece 21–24 | -0,086 | -0,034 | -0,042 | -0,061 / -0,026 |
| dOpen | Gece 21–24 | -0,043 | -0,034 | -0,047 | -0,052 / -0,023 |
| asiaPos | Gece 21–24 | -0,043 | -0,032 | -0,046 | -0,039 / -0,021 |
| r4 | Asya 00–07 | -0,076 | -0,032 | -0,022 | -0,065 / -0,030 |
| r1 | Asya 00–07 | -0,079 | -0,032 | -0,029 | -0,075 / -0,032 |
| r24 | Gece 21–24 | -0,043 | -0,032 | -0,046 | -0,045 / -0,023 |
| vwapD | Asya 00–07 | -0,077 | -0,032 | -0,024 | -0,064 / -0,028 |
| r24 | Asya 00–07 | -0,055 | -0,032 | -0,023 | -0,045 / -0,023 |
| rsi | Asya 00–07 | -0,065 | -0,032 | -0,026 | -0,057 / -0,028 |
| hi7 | Asya 00–07 | -0,047 | -0,031 | -0,025 | -0,036 / -0,026 |
| r1 | New York 12–21 | -0,068 | -0,031 | -0,025 | -0,075 / -0,032 |
| r15 | New York 12–21 | -0,069 | -0,031 | -0,028 | -0,072 / -0,029 |
| rel4 | Asya 00–07 | -0,075 | -0,030 | -0,021 | -0,064 / -0,028 |
| run | Londra 07–12 | -0,055 | -0,030 | -0,021 | -0,048 / -0,027 |
| spotLead | Gece 21–24 | +0,043 | +0,029 | +0,031 | +0,036 / +0,017 |
| rel24 | Asya 00–07 | -0,052 | -0,029 | -0,021 | -0,045 / -0,021 |
| xs4 | Asya 00–07 | -0,073 | -0,029 | -0,022 | -0,061 / -0,026 |
| r15 | Asya 00–07 | -0,068 | -0,029 | -0,025 | -0,072 / -0,029 |
| r15 | Gece 21–24 | -0,075 | -0,029 | -0,029 | -0,072 / -0,029 |

## Çift etkileşim taraması

İlk yarıda IC'si en yüksek 24 değişken, ikişer ikişer 5 × 5 hücreye bölündü (sınırlar ilk yarıdan). Hücre = 1 sa getiri ortalaması (oynaklık biriminde; 0,10 ≈ coinin 1 saatlik oynaklığının onda biri). İlk yarıda |ort.| ≥ 0,06 ve n ≥ 3000 olan hücreler, ikinci yarı ve son 12 ayda aynı işaretli mi? (Yaklaşık 6900 hücre denendi; aynı işaret şansla %50.)

| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |
|---|---|---|---|---|---|
Aday hücre 52, üç dönemde de aynı işaretli 21. En güçlü 30 aday:

| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |
|---|---|---|---|---|---|
| r4 (1) | rel4 (5) | +0,090 (3,849) | +0,063 (2,475) | +0,017 (928) | zayıf |
| bb (1) | dOpen (5) | +0,087 (10,591) | +0,063 (9,154) | +0,009 (2,501) | zayıf |
| bb (1) | rel4 (5) | +0,083 (3,224) | +0,066 (2,362) | -0,078 (948) | zayıf |
| rel4 (5) | rsi (1) | +0,083 (3,441) | +0,063 (2,131) | +0,064 (793) | **tutuyor** |
| rel4 (5) | rsi (2) | +0,083 (7,277) | -0,016 (6,387) | -0,094 (2,156) | tutmuyor |
| rsi (1) | asiaPos (5) | +0,081 (5,597) | +0,041 (5,053) | -0,025 (1,572) | zayıf |
| vwapD (1) | dOpen (5) | +0,080 (3,819) | +0,072 (3,452) | -0,020 (821) | zayıf |
| r1 (1) | vwapD (5) | +0,078 (14,605) | +0,051 (13,276) | +0,008 (3,834) | zayıf |
| bb (1) | r24 (5) | +0,077 (16,845) | +0,037 (16,773) | -0,002 (4,280) | zayıf |
| r4 (1) | asiaPos (5) | +0,074 (5,543) | +0,019 (5,190) | -0,042 (1,524) | zayıf |
| r4 (2) | rel4 (5) | +0,073 (4,330) | +0,001 (3,641) | -0,073 (1,284) | zayıf |
| rsi (5) | asiaPos (1) | -0,073 (5,694) | -0,004 (6,050) | +0,002 (1,903) | zayıf |
| rsi (1) | dOpen (5) | +0,072 (10,006) | +0,049 (9,047) | -0,018 (2,555) | zayıf |
| run (1) | spotLead (5) | +0,071 (17,746) | +0,061 (10,179) | +0,026 (2,931) | zayıf |
| r1 (1) | r4 (5) | +0,070 (16,861) | +0,028 (16,058) | +0,004 (4,434) | zayıf |
| r1 (1) | rsi (5) | +0,070 (8,442) | +0,039 (8,042) | +0,011 (2,199) | zayıf |
| r24 (2) | rel24 (5) | +0,070 (4,110) | +0,033 (3,307) | -0,040 (1,305) | zayıf |
| r4 (3) | rel4 (5) | +0,069 (7,855) | +0,022 (7,431) | -0,001 (2,520) | zayıf |
| pos24 (5) | pdh (1) | -0,069 (3,831) | +0,066 (2,764) | +0,136 (828) | tutmuyor |
| bb (1) | pdl (5) | +0,069 (18,652) | +0,055 (16,838) | +0,020 (4,148) | zayıf |
| bb (3) | r4 (5) | +0,068 (13,357) | +0,019 (12,465) | -0,010 (3,425) | zayıf |
| bb (2) | rel4 (5) | +0,068 (6,592) | +0,014 (5,617) | -0,083 (1,925) | zayıf |
| rel4 (2) | xs4 (5) | -0,068 (5,035) | +0,034 (3,299) | -0,031 (336) | tutmuyor |
| r1 (1) | asiaPos (5) | +0,067 (14,698) | +0,047 (13,834) | -0,008 (4,171) | zayıf |
| rsi (1) | pdl (5) | +0,067 (17,586) | +0,047 (16,536) | +0,018 (4,266) | zayıf |
| vwapD (5) | run (1) | +0,066 (7,657) | +0,076 (6,815) | +0,024 (1,859) | zayıf |
| rsi (1) | r24 (5) | +0,066 (15,486) | +0,024 (16,174) | -0,013 (4,323) | zayıf |
| run (2) | r24 (5) | +0,066 (20,017) | +0,027 (17,895) | -0,008 (4,388) | zayıf |
| bb (5) | dOpen (1) | -0,065 (11,202) | -0,021 (10,451) | -0,059 (3,070) | zayıf |
| r15 (1) | pos24 (4) | +0,065 (32,764) | +0,026 (30,774) | +0,007 (8,353) | zayıf |

## Sağlamlık: kapanış fiyatı sıçraması

15 dk kapanışı son işlemin fiyatıdır; alış tarafında biten mum bir sonraki mumda "düşmüş" görünür. Kapanıştan kapanışa ölçülen 1 saatlik geri dönüşün büyük kısmı bu yapay etkidir. Aşağıda aynı tahminler üç ölçüyle: kapanış→kapanış (modelin eğitildiği), sonraki mumun açılışı→kapanış, sonraki mumun VWAP'ı→çıkış mumunun VWAP'ı (gerçekçi dolum).

| Dönem | IC kapanış→kapanış | IC açılış→kapanış | IC VWAP→VWAP 1 sa | IC VWAP→VWAP 4 sa |
|---|---|---|---|---|
| 1. yarı | +0,053 | +0,049 | +0,031 | +0,028 |
| 2. yarı | +0,105 | +0,085 | +0,012 | +0,008 |
| son 12 ay | +0,142 | +0,116 | +0,006 | +0,002 |

Üst onluk − alt onluk, VWAP ile (iki bacak toplamı %, maliyetsiz; maker iki bacak %0,08):

- 1 sa: 1. yarı +0,062% · 2. yarı +0,046% · son 12 ay +0,058%
- 4 sa: 1. yarı +0,107% · 2. yarı +0,078% · son 12 ay +0,109%

Saat başı en güçlü 2 long + 2 short, VWAP dolumla (işlem başı %, maliyetsiz; taker %0,16, maker %0,04 düşülecek):

| Tutuş | Dönem | İşlem | Ort. % | Long | Short | Kazanma |
|---|---|---|---|---|---|---|
| 1 sa | 1. yarı | 14,404 | +0,117 | +0,145 | +0,096 | %53,1 |
| 1 sa | 2. yarı | 37,542 | +0,064 | +0,046 | +0,075 | %51,7 |
| 1 sa | son 12 ay | 19,349 | +0,053 | +0,017 | +0,077 | %51,2 |
| 4 sa | 1. yarı | 10,281 | +0,132 | +0,191 | +0,083 | %52,0 |
| 4 sa | 2. yarı | 25,893 | +0,098 | +0,049 | +0,130 | %51,2 |
| 4 sa | son 12 ay | 12,966 | +0,078 | -0,068 | +0,171 | %50,4 |

## Karar

1 sa modeli kapanıştan kapanışa IC: 1. yarı +0,053, 2. yarı +0,105, son 12 ay +0,142; VWAP dolumla +0,031 / +0,012 / +0,006. Gerçekçi işlem (2+2, VWAP, 1 sa) maker maliyet sonrası: 1. yarı +0,077% · 2. yarı +0,024% · son 12 ay +0,013%. Kriter (üç dönemde de maker sonrası artı): **GEÇTİ**; taker ile hiçbir dönemde artı değil.

## Değişken listesi

r15, r1, r4, r24, r7d, r30d, sq, sq7, rng4, rng1v24, ac1, rsi, bb, hi30, lo30, sinceHi30, sinceLo30, hi7, lo7, pos24, pos7, vq15, vq1, vq24, vTrend, cnt15, cnt1, size15, size1, size24, tk15, tk1, tk4, tk24, tkTrend, body15, run, uw, lw, big4, sweepU, sweepD, dOpen, pdh, pdl, pdPos, asiaPos, asiaRng, vwapD, wkOpen, dRng, oi15, oi1, oi4, oi24, oiZ7, oiVsPx1, oiVsPx4, oiVsPx24, oiTurn, topPosZ, topAccZ, globZ, smartDiv, topPosCh4, globCh4, takerM, fr, frZ, frCh, frCrowd, prem, premZ, premCh, basis, basisCh, spotShare, spotShareCh, spotTk, spotLead, b15, b1, b4, b24, bPrev1, bs50, bs200, bVol, bPos24, rel4, rel24, xs1, xs4, xs24, breadth1, breadth4, disp4, eth4, top10m4, nCoins, hr, dow, sess, minFund, dom, monthEnd, fri8, weekend, age

