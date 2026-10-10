# Denklem · ~100 değişkenle 15 dk/1 sa/4 sa yön modeli, seans ve etkileşimler · 2026-10-08

Hedef ölçüsü: **VWAP → VWAP (gerçekçi dolum)**, veri 2023-06 sonrası, derinlik değişkenleri dışarıda.

874,999 saatlik gözlem, 267 coin (ayın ilk 30'u), 2023-06 → 2026-10, 109 değişken (liste sonda). Hedef: sonraki 1 sa ve 4 sa getiri ÷ coinin 30 günlük oynaklığı (±5 kırpılmış). Model: LightGBM, ileriye yürüyen (her 6 ayda bir yalnız geçmişle yeniden eğitilir, ilk 12 ay yalnız eğitim). Bütün sayılar örneklem dışı.

**IC** = her saatte coinleri tahmine göre sıralayıp gerçek getiriyle Spearman ilişkisi, saatlerin ortalaması (0 = bilgi yok; 0,05 zayıf ama gerçek; 0,10 güçlü). t ≥ 3 anlamlı sayılır.

## 1 saat hedefi

| Dönem | n | Coinler arası IC | t | Havuz IC (aylık) | t |
|---|---|---|---|---|---|
| tümü | 613,220 | +0,021 | +12,7 | +0,039 | +7,2 |
| 1. yarı | 306,592 | +0,020 | +8,8 | +0,041 | +4,8 |
| 2. yarı | 306,628 | +0,022 | +9,2 | +0,036 | +5,3 |
| son 12 ay | 261,539 | +0,021 | +7,8 | +0,033 | +4,0 |

**Seansa göre** (ortak model, o seansın saatleri):

| Seans | 1. yarı IC | t | 2. yarı IC | t | son 12 ay IC | t |
|---|---|---|---|---|---|---|
| Asya 00–07 | +0,015 | +3,5 | +0,023 | +5,3 | +0,022 | +4,5 |
| Londra 07–12 | +0,027 | +5,6 | +0,024 | +4,8 | +0,024 | +4,3 |
| New York 12–21 | +0,025 | +6,5 | +0,025 | +6,2 | +0,023 | +5,2 |
| Gece 21–24 | +0,008 | +1,2 | +0,008 | +1,2 | +0,006 | +0,8 |

**Saate göre** (UTC; 1. yarı / 2. yarı IC):

00: +0,00 / +0,03 · 01: +0,05 / +0,01 · 02: +0,02 / +0,03 · 03: -0,00 / +0,01 · 04: +0,01 / +0,04 · 05: +0,01 / +0,02 · 06: +0,01 / +0,03 · 07: +0,03 / +0,01 · 08: +0,02 / +0,04 · 09: +0,02 / +0,00 · 10: +0,03 / +0,03 · 11: +0,04 / +0,04 · 12: +0,04 / +0,03 · 13: +0,02 / +0,04 · 14: +0,03 / +0,03 · 15: +0,01 / -0,00 · 16: +0,03 / +0,04 · 17: +0,04 / +0,05 · 18: +0,03 / +0,02 · 19: -0,00 / +0,02 · 20: +0,03 / +0,00 · 21: +0,01 / +0,02 · 22: +0,01 / +0,01 · 23: +0,00 / -0,00

**Güne göre** (Pzt…Paz; 1. yarı / 2. yarı IC):

Pzt: +0,02 / +0,02 · Sal: +0,03 / +0,01 · Çar: +0,02 / +0,03 · Per: +0,02 / +0,03 · Cum: +0,01 / +0,03 · Cmt: +0,02 / +0,02 · Paz: +0,02 / +0,03

**Onluklar** (her saat coinler tahmine göre 10 dilime; gerçek 1 saat getirisi %, maliyetsiz, yön long):

| Onluk | n | ort. % | kazanma | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| 1 (en düşük tahmin) | 58,250 | -0,055 | %47,7 | -0,031 | -0,079 | -0,090 |
| 2 | 61,752 | -0,022 | %48,6 | -0,022 | -0,022 | -0,026 |
| 3 | 61,776 | -0,024 | %48,5 | -0,017 | -0,030 | -0,036 |
| 4 | 61,700 | -0,021 | %49,0 | -0,010 | -0,033 | -0,038 |
| 5 | 61,776 | -0,014 | %49,1 | -0,006 | -0,022 | -0,025 |
| 6 | 60,962 | -0,006 | %49,2 | +0,002 | -0,014 | -0,017 |
| 7 | 61,700 | -0,006 | %49,2 | -0,012 | -0,001 | -0,004 |
| 8 | 61,776 | -0,003 | %49,1 | -0,003 | -0,003 | -0,005 |
| 9 | 61,752 | -0,008 | %49,4 | -0,006 | -0,010 | -0,012 |
| 10 (en yüksek) | 61,776 | +0,002 | %49,3 | +0,001 | +0,002 | -0,001 |

Üst onluk long − alt onluk short (saat başına, iki bacak toplamı %, maliyetsiz): 1. yarı +0,031% (t +3,2) · 2. yarı +0,086% (t +4,3) · son 12 ay +0,091% (t +4,0). Maliyet iki bacak için maker %0,08, taker %0,32.

En çok kullanılan girdiler (kazanç payı %): bVol 7.4, b1 7.1, b15 6.9, b24 6.7, bPos24 6.3, bs50 6.2, b4 6.2, bPrev1 5.9, bs200 5.2, breadth1 3.9, hr 3.8, breadth4 3.6, dom 3.4, minFund 2.3, dow 2.0, top10m4 1.9, eth4 1.4, rng4 1.3, sq 1.2, dRng 1.1, asiaRng 1.0, r15 1.0, vwapD 0.8, cnt15 0.8, rng1v24 0.7

## 4 saat hedefi

| Dönem | n | Coinler arası IC | t | Havuz IC (aylık) | t |
|---|---|---|---|---|---|
| tümü | 613,220 | +0,011 | +6,3 | +0,036 | +4,0 |
| 1. yarı | 306,592 | +0,018 | +7,6 | +0,053 | +3,9 |
| 2. yarı | 306,628 | +0,004 | +1,6 | +0,016 | +2,0 |
| son 12 ay | 261,539 | +0,002 | +0,9 | +0,022 | +2,7 |

**Seansa göre** (ortak model, o seansın saatleri):

| Seans | 1. yarı IC | t | 2. yarı IC | t | son 12 ay IC | t |
|---|---|---|---|---|---|---|
| Asya 00–07 | +0,025 | +6,0 | +0,016 | +3,5 | +0,013 | +2,6 |
| Londra 07–12 | +0,023 | +4,4 | +0,012 | +2,2 | +0,012 | +2,1 |
| New York 12–21 | +0,015 | +4,0 | -0,003 | -0,7 | -0,002 | -0,5 |
| Gece 21–24 | -0,002 | -0,4 | -0,017 | -2,5 | -0,026 | -3,4 |

**Saate göre** (UTC; 1. yarı / 2. yarı IC):

00: +0,02 / +0,02 · 01: +0,03 / +0,03 · 02: +0,03 / +0,02 · 03: +0,02 / +0,02 · 04: +0,02 / +0,02 · 05: +0,03 / +0,00 · 06: +0,02 / -0,01 · 07: +0,02 / -0,01 · 08: +0,03 / -0,00 · 09: +0,03 / +0,01 · 10: +0,01 / +0,04 · 11: +0,02 / +0,02 · 12: +0,02 / +0,01 · 13: +0,02 / +0,01 · 14: +0,03 / +0,00 · 15: +0,01 / +0,01 · 16: +0,03 / +0,01 · 17: +0,02 / +0,00 · 18: +0,01 / -0,01 · 19: -0,01 / -0,02 · 20: +0,01 / -0,03 · 21: -0,01 / -0,02 · 22: -0,01 / -0,01 · 23: +0,01 / -0,02

**Güne göre** (Pzt…Paz; 1. yarı / 2. yarı IC):

Pzt: +0,03 / -0,00 · Sal: +0,03 / -0,01 · Çar: +0,03 / +0,01 · Per: +0,02 / -0,01 · Cum: +0,00 / +0,01 · Cmt: +0,01 / +0,01 · Paz: +0,01 / +0,02

**Onluklar** (her saat coinler tahmine göre 10 dilime; gerçek 4 saat getirisi %, maliyetsiz, yön long):

| Onluk | n | ort. % | kazanma | 1. yarı | 2. yarı | son 12 ay |
|---|---|---|---|---|---|---|
| 1 (en düşük tahmin) | 58,250 | -0,193 | %47,6 | -0,091 | -0,292 | -0,349 |
| 2 | 61,752 | -0,095 | %48,3 | -0,065 | -0,125 | -0,144 |
| 3 | 61,776 | -0,056 | %48,6 | -0,063 | -0,049 | -0,061 |
| 4 | 61,700 | -0,050 | %48,5 | -0,058 | -0,041 | -0,048 |
| 5 | 61,776 | -0,049 | %48,3 | -0,046 | -0,052 | -0,061 |
| 6 | 60,962 | -0,057 | %48,3 | -0,054 | -0,061 | -0,079 |
| 7 | 61,700 | -0,036 | %48,6 | -0,019 | -0,053 | -0,062 |
| 8 | 61,776 | -0,056 | %48,3 | -0,023 | -0,089 | -0,101 |
| 9 | 61,752 | -0,012 | %48,8 | +0,008 | -0,033 | -0,041 |
| 10 (en yüksek) | 61,776 | -0,029 | %48,2 | -0,001 | -0,057 | -0,078 |

Üst onluk long − alt onluk short (saat başına, iki bacak toplamı %, maliyetsiz): 1. yarı +0,093% (t +4,8) · 2. yarı +0,247% (t +6,0) · son 12 ay +0,278% (t +6,0). Maliyet iki bacak için maker %0,08, taker %0,32.

En çok kullanılan girdiler (kazanç payı %): bs200 11.6, bVol 10.2, bs50 9.4, b24 8.2, dom 8.1, hr 4.9, bPos24 4.1, dow 4.0, b4 3.3, breadth4 2.3, b15 2.2, asiaRng 1.9, b1 1.8, bPrev1 1.8, top10m4 1.5, breadth1 1.4, sq 1.4, eth4 1.2, rng4 1.2, sinceLo30 1.2, asiaPos 1.1, wkOpen 1.1, dRng 1.1, pdh 0.8, sq7 0.8

## Gerçek işlem gibi: saat başı en güçlü 2 long + 2 short

Tahmin eğitim dağılımının üst %5 / alt %5 eşiğini geçmeli; coin başına tek açık işlem; giriş saat kapanışı, çıkış 1 sa (ya da 4 sa) sonra kapanış; maliyet gidiş-dönüş maker %0,04, taker %0,16.

| Tutuş | Yön | İşlem | Kazanma (maliyetsiz) | 1. yarı ort. % (taker / maker) | 2. yarı | son 12 ay | Günde işlem |
|---|---|---|---|---|---|---|---|
| 1 sa | long | 5,104 | %53,8 | -0,062 / +0,058 (n 2,250) | -0,181 / -0,061 (n 2,854) | -0,189 / -0,069 (n 2,660) | 8.2 |
| 1 sa | short | 4,613 | %54,0 | -0,012 / +0,108 (n 1,867) | +0,147 / +0,267 (n 2,746) | +0,225 / +0,345 (n 2,326) | 6.2 |
| 1 sa | ikisi | 9,717 | %53,9 | -0,040 / +0,080 (n 4,117) | -0,020 / +0,100 (n 5,600) | +0,004 / +0,124 (n 4,986) | 11.9 |
| 4 sa | long | 3,985 | %54,4 | +0,111 / +0,231 (n 1,807) | -0,343 / -0,223 (n 2,178) | -0,374 / -0,254 (n 2,026) | 6.4 |
| 4 sa | short | 3,605 | %52,8 | +0,127 / +0,247 (n 1,605) | +0,370 / +0,490 (n 2,000) | +0,523 / +0,643 (n 1,674) | 4.9 |
| 4 sa | ikisi | 7,369 | %53,4 | +0,117 / +0,237 (n 3,298) | +0,024 / +0,144 (n 4,071) | +0,065 / +0,185 (n 3,606) | 9.0 |

## Seansa özel modeller (yalnız o seansın verisiyle eğitilen) ile ortak model

| Seans | Ortak model IC (1. / 2. yarı) | Seans modeli IC (1. / 2. yarı) |
|---|---|---|
| Asya 00–07 | +0,015 / +0,023 | +0,019 / +0,023 |
| Londra 07–12 | +0,027 / +0,024 | +0,021 / +0,012 |
| New York 12–21 | +0,025 / +0,025 | +0,019 / +0,022 |
| Gece 21–24 | +0,008 / +0,008 | +0,030 / +0,021 |

## Tek değişken, seansa göre (ham, modelsiz)

Her değişkenin 1 sa hedefiyle coinler arası IC'si, seans seans. Yalnız iki yarıda da aynı işaretli ve |IC| ≥ 0,02 olanlar (toplam 4 × 109 deneme; şans eseri birkaçı geçer).

| Değişken | Seans | 1. yarı | 2. yarı | son 12 ay | Tüm seanslar 1. / 2. yarı |
|---|---|---|---|---|---|
| bb | Gece 21–24 | -0,047 | -0,050 | -0,059 | -0,039 / -0,036 |
| r4 | Gece 21–24 | -0,043 | -0,043 | -0,052 | -0,035 / -0,030 |
| r1 | Gece 21–24 | -0,042 | -0,056 | -0,064 | -0,041 / -0,036 |
| r1 | Asya 00–07 | -0,042 | -0,036 | -0,042 | -0,041 / -0,036 |
| bb | Asya 00–07 | -0,046 | -0,036 | -0,036 | -0,039 / -0,036 |
| vwapD | Gece 21–24 | -0,034 | -0,046 | -0,058 | -0,029 / -0,031 |
| r15 | New York 12–21 | -0,037 | -0,034 | -0,034 | -0,034 / -0,033 |
| r1 | New York 12–21 | -0,043 | -0,034 | -0,038 | -0,041 / -0,036 |
| bb | New York 12–21 | -0,036 | -0,033 | -0,039 | -0,039 / -0,036 |
| vwapD | Asya 00–07 | -0,042 | -0,033 | -0,034 | -0,029 / -0,031 |
| rsi | Gece 21–24 | -0,033 | -0,041 | -0,051 | -0,029 / -0,030 |
| rel4 | Gece 21–24 | -0,032 | -0,038 | -0,045 | -0,032 / -0,029 |
| hi7 | Gece 21–24 | -0,047 | -0,032 | -0,029 | -0,030 / -0,021 |
| xs1 | New York 12–21 | -0,034 | -0,032 | -0,036 | -0,033 / -0,032 |
| r4 | Asya 00–07 | -0,044 | -0,032 | -0,032 | -0,035 / -0,030 |
| r15 | Londra 07–12 | -0,031 | -0,033 | -0,035 | -0,034 / -0,033 |
| r15 | Asya 00–07 | -0,035 | -0,031 | -0,032 | -0,034 / -0,033 |
| xs1 | Gece 21–24 | -0,031 | -0,048 | -0,050 | -0,033 / -0,032 |
| dOpen | Asya 00–07 | -0,046 | -0,031 | -0,032 | -0,023 / -0,026 |
| xs1 | Asya 00–07 | -0,034 | -0,030 | -0,035 | -0,033 / -0,032 |
| xs4 | Asya 00–07 | -0,037 | -0,030 | -0,030 | -0,028 / -0,028 |
| rsi | Asya 00–07 | -0,038 | -0,030 | -0,032 | -0,029 / -0,030 |
| rel4 | Asya 00–07 | -0,040 | -0,030 | -0,030 | -0,032 / -0,029 |
| bb | Londra 07–12 | -0,029 | -0,035 | -0,041 | -0,039 / -0,036 |
| r15 | Gece 21–24 | -0,029 | -0,033 | -0,034 | -0,034 / -0,033 |
| run | New York 12–21 | -0,029 | -0,030 | -0,032 | -0,029 / -0,029 |
| run | Londra 07–12 | -0,033 | -0,029 | -0,021 | -0,029 / -0,029 |
| lo7 | Gece 21–24 | +0,030 | +0,029 | +0,026 | +0,023 / +0,019 |
| r1 | Londra 07–12 | -0,034 | -0,028 | -0,037 | -0,041 / -0,036 |
| xs4 | Gece 21–24 | -0,028 | -0,030 | -0,039 | -0,028 / -0,028 |

## Çift etkileşim taraması

İlk yarıda IC'si en yüksek 24 değişken, ikişer ikişer 5 × 5 hücreye bölündü (sınırlar ilk yarıdan). Hücre = 1 sa getiri ortalaması (oynaklık biriminde; 0,10 ≈ coinin 1 saatlik oynaklığının onda biri). İlk yarıda |ort.| ≥ 0,06 ve n ≥ 3000 olan hücreler, ikinci yarı ve son 12 ayda aynı işaretli mi? (Yaklaşık 6900 hücre denendi; aynı işaret şansla %50.)

| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |
|---|---|---|---|---|---|
Aday hücre 279, üç dönemde de aynı işaretli 226. En güçlü 30 aday:

| Değişken A (beşlik) | Değişken B (beşlik) | 1. yarı ort. (n) | 2. yarı ort. (n) | son 12 ay ort. (n) | Yorum |
|---|---|---|---|---|---|
| run (1) | rng4 (5) | +0,183 (9,787) | +0,099 (9,117) | +0,097 (5,348) | **tutuyor** |
| bb (1) | rng4 (5) | +0,181 (16,300) | +0,075 (14,995) | +0,017 (8,969) | zayıf |
| r1 (1) | xs1 (5) | +0,155 (5,945) | +0,038 (3,915) | +0,002 (1,532) | zayıf |
| r1 (1) | rng4 (5) | +0,138 (27,271) | +0,051 (25,015) | +0,027 (14,939) | zayıf |
| pos24 (1) | rng4 (5) | +0,137 (15,778) | +0,023 (18,763) | -0,013 (11,265) | zayıf |
| vwapD (1) | rng4 (5) | +0,130 (27,174) | +0,030 (24,816) | +0,003 (15,073) | zayıf |
| body15 (1) | rng4 (5) | +0,130 (17,055) | +0,056 (15,794) | +0,009 (9,197) | zayıf |
| r15 (1) | rng4 (5) | +0,125 (26,481) | +0,065 (24,253) | +0,028 (14,251) | zayıf |
| r24 (1) | rng4 (5) | +0,124 (26,234) | +0,036 (25,542) | -0,006 (15,057) | zayıf |
| rsi (1) | rng4 (5) | +0,124 (19,840) | +0,036 (18,085) | -0,006 (11,055) | zayıf |
| r4 (1) | r15 (1) | +0,122 (29,526) | +0,045 (27,489) | +0,027 (14,793) | zayıf |
| r15 (1) | vwapD (1) | +0,120 (28,482) | +0,047 (27,185) | +0,026 (14,414) | zayıf |
| run (1) | r24 (1) | +0,119 (12,640) | +0,060 (13,127) | +0,069 (7,234) | **tutuyor** |
| r4 (1) | xs4 (5) | +0,119 (5,676) | +0,033 (3,995) | -0,016 (1,780) | zayıf |
| pdl (1) | rng4 (5) | +0,119 (20,130) | +0,036 (19,589) | -0,024 (11,484) | zayıf |
| run (1) | pdh (1) | +0,116 (12,586) | +0,064 (13,352) | +0,071 (7,298) | **tutuyor** |
| r15 (1) | dOpen (1) | +0,116 (23,806) | +0,047 (23,686) | +0,033 (12,640) | **tutuyor** |
| rng4 (5) | pdPos (1) | +0,115 (21,802) | +0,037 (21,828) | -0,017 (12,756) | zayıf |
| r4 (1) | body15 (1) | +0,112 (23,748) | +0,041 (22,502) | +0,022 (12,191) | zayıf |
| bb (1) | xs4 (5) | +0,111 (6,208) | +0,033 (4,640) | -0,042 (2,090) | zayıf |
| r4 (1) | rng4 (5) | +0,111 (30,799) | +0,021 (27,577) | -0,003 (16,515) | zayıf |
| bb (1) | dOpen (5) | +0,111 (5,054) | +0,028 (4,519) | +0,020 (2,510) | zayıf |
| run (1) | dOpen (1) | +0,111 (13,562) | +0,071 (14,069) | +0,077 (7,615) | **tutuyor** |
| dOpen (1) | rng4 (5) | +0,110 (26,910) | +0,033 (25,003) | -0,008 (14,967) | zayıf |
| run (1) | rel24 (1) | +0,109 (12,310) | +0,047 (11,498) | +0,061 (5,994) | **tutuyor** |
| r1 (1) | dOpen (1) | +0,109 (29,016) | +0,044 (29,542) | +0,035 (16,429) | **tutuyor** |
| r15 (1) | run (1) | +0,108 (20,851) | +0,074 (18,493) | +0,062 (9,813) | **tutuyor** |
| rng4 (5) | pdh (1) | +0,108 (31,620) | +0,031 (30,907) | -0,017 (18,139) | zayıf |
| r4 (1) | xs4 (4) | +0,107 (8,419) | +0,016 (8,006) | +0,011 (4,339) | zayıf |
| bb (1) | disp4 (5) | +0,106 (16,492) | +0,040 (32,419) | +0,025 (23,888) | zayıf |

## Sağlamlık: kapanış fiyatı sıçraması

15 dk kapanışı son işlemin fiyatıdır; alış tarafında biten mum bir sonraki mumda "düşmüş" görünür. Kapanıştan kapanışa ölçülen 1 saatlik geri dönüşün büyük kısmı bu yapay etkidir. Aşağıda aynı tahminler üç ölçüyle: kapanış→kapanış (modelin eğitildiği), sonraki mumun açılışı→kapanış, sonraki mumun VWAP'ı→çıkış mumunun VWAP'ı (gerçekçi dolum).

| Dönem | IC kapanış→kapanış | IC açılış→kapanış | IC VWAP→VWAP 1 sa | IC VWAP→VWAP 4 sa |
|---|---|---|---|---|
| 1. yarı | +0,020 | +0,027 | +0,015 | +0,011 |
| 2. yarı | +0,022 | +0,059 | +0,021 | +0,017 |
| son 12 ay | +0,021 | +0,059 | +0,021 | +0,017 |

Üst onluk − alt onluk, VWAP ile (iki bacak toplamı %, maliyetsiz; maker iki bacak %0,08):

- 1 sa: 1. yarı +0,032% · 2. yarı +0,082% · son 12 ay +0,088%
- 4 sa: 1. yarı +0,042% · 2. yarı +0,215% · son 12 ay +0,247%

Saat başı en güçlü 2 long + 2 short, VWAP dolumla (işlem başı %, maliyetsiz; taker %0,16, maker %0,04 düşülecek):

| Tutuş | Dönem | İşlem | Ort. % | Long | Short | Kazanma |
|---|---|---|---|---|---|---|
| 1 sa | 1. yarı | 4,117 | +0,120 | +0,098 | +0,148 | %55,6 |
| 1 sa | 2. yarı | 5,600 | +0,140 | -0,021 | +0,307 | %52,6 |
| 1 sa | son 12 ay | 4,986 | +0,164 | -0,029 | +0,385 | %52,3 |
| 4 sa | 1. yarı | 3,298 | +0,277 | +0,270 | +0,284 | %56,3 |
| 4 sa | 2. yarı | 4,071 | +0,184 | -0,126 | +0,519 | %51,1 |
| 4 sa | son 12 ay | 3,606 | +0,225 | -0,148 | +0,674 | %51,0 |

## Karar

1 sa modeli kapanıştan kapanışa IC: 1. yarı +0,020, 2. yarı +0,022, son 12 ay +0,021; VWAP dolumla +0,015 / +0,021 / +0,021. Gerçekçi işlem (2+2, VWAP, 1 sa) maker maliyet sonrası: 1. yarı +0,080% · 2. yarı +0,100% · son 12 ay +0,124%. Kriter (üç dönemde de maker sonrası artı): **GEÇTİ**; taker ile hiçbir dönemde artı değil.

## Değişken listesi

r15, r1, r4, r24, r7d, r30d, sq, sq7, rng4, rng1v24, ac1, rsi, bb, hi30, lo30, sinceHi30, sinceLo30, hi7, lo7, pos24, pos7, vq15, vq1, vq24, vTrend, cnt15, cnt1, size15, size1, size24, tk15, tk1, tk4, tk24, tkTrend, body15, run, uw, lw, big4, sweepU, sweepD, dOpen, pdh, pdl, pdPos, asiaPos, asiaRng, vwapD, wkOpen, dRng, oi15, oi1, oi4, oi24, oiZ7, oiVsPx1, oiVsPx4, oiVsPx24, oiTurn, topPosZ, topAccZ, globZ, smartDiv, topPosCh4, globCh4, takerM, fr, frZ, frCh, frCrowd, prem, premZ, premCh, basis, basisCh, spotShare, spotShareCh, spotTk, spotLead, b15, b1, b4, b24, bPrev1, bs50, bs200, bVol, bPos24, rel4, rel24, xs1, xs4, xs24, breadth1, breadth4, disp4, eth4, top10m4, nCoins, hr, dow, sess, minFund, dom, monthEnd, fri8, weekend, age

