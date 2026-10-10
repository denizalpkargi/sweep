# Denklem 4 ek · arındırılmış hedef ve coin düzeyi değişkenlerle LightGBM · 2026-10-09

874,999 saat; 38 piyasa düzeyi değişken (aynı saatte her coin için aynı; saat içi std / genel std < 0,02) çıkarıldı: b15, b1, b4, b24, bPrev1, bs50, bs200, bVol, bPos24, breadth1, breadth4, nCoins, hr, dow, sess, minFund, dom, monthEnd, fri8, weekend, sessId, sinceSess, oiDay, oiHi30, ethBtc24, bMinusAlt24, toFomc, fromFomc, toCpi, fromCpi, toNfp, fromNfp, evWin, toOptExp, toWkExp, cmeOpen, sinceHalving, bDdAth. Boşluk 2 gün. Arındırılmış hedef = coin getirisi − aynı saatteki coinlerin ortalaması. Aynı ileriye yürüyen bölünmeler (test 6 ay, 5 pencere).

| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % | Üst onluk % | Alt onluk % |
|---|---|---|---|---|---|---|---|---|
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 4 sa | tümü | 613,220 | +0,058 | +31,1 | +0,218 | -0,003 | -0,221 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 4 sa | 1. yarı | 306,592 | +0,065 | +25,9 | +0,155 | +0,013 | -0,142 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 4 sa | 2. yarı | 306,628 | +0,050 | +18,5 | +0,278 | -0,020 | -0,297 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 4 sa | son 12 ay | 261,539 | +0,047 | +15,7 | +0,317 | -0,033 | -0,350 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 12 sa | tümü | 613,220 | +0,062 | +33,9 | +0,586 | -0,077 | -0,663 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 12 sa | 1. yarı | 306,592 | +0,070 | +27,8 | +0,344 | +0,024 | -0,320 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 12 sa | 2. yarı | 306,628 | +0,053 | +20,3 | +0,816 | -0,178 | -0,994 |
| LGB lambdarank (saat içi onluk etiketi), tüm değişkenler | 12 sa | son 12 ay | 261,539 | +0,049 | +17,0 | +0,884 | -0,229 | -1,113 |
| LGB lambdarank, yalnız coin değişkenleri | 4 sa | tümü | 613,220 | +0,057 | +30,0 | +0,221 | -0,001 | -0,222 |
| LGB lambdarank, yalnız coin değişkenleri | 4 sa | 1. yarı | 306,592 | +0,064 | +25,0 | +0,165 | +0,025 | -0,140 |
| LGB lambdarank, yalnız coin değişkenleri | 4 sa | 2. yarı | 306,628 | +0,050 | +17,8 | +0,274 | -0,027 | -0,301 |
| LGB lambdarank, yalnız coin değişkenleri | 4 sa | son 12 ay | 261,539 | +0,046 | +14,9 | +0,304 | -0,041 | -0,345 |
| LGB lambdarank, yalnız coin değişkenleri | 12 sa | tümü | 613,220 | +0,064 | +35,1 | +0,600 | -0,061 | -0,662 |
| LGB lambdarank, yalnız coin değişkenleri | 12 sa | 1. yarı | 306,592 | +0,076 | +30,5 | +0,434 | +0,034 | -0,400 |
| LGB lambdarank, yalnız coin değişkenleri | 12 sa | 2. yarı | 306,628 | +0,052 | +19,5 | +0,757 | -0,156 | -0,913 |
| LGB lambdarank, yalnız coin değişkenleri | 12 sa | son 12 ay | 261,539 | +0,045 | +15,4 | +0,807 | -0,206 | -1,013 |

## Karar

4 sa: LGB lambdarank (saat içi onluk etiketi), tüm değişkenler +0,058 (son 12 ay +0,047) · LGB lambdarank, yalnız coin değişkenleri +0,057 (son 12 ay +0,046)
12 sa: LGB lambdarank (saat içi onluk etiketi), tüm değişkenler +0,062 (son 12 ay +0,049) · LGB lambdarank, yalnız coin değişkenleri +0,064 (son 12 ay +0,045)
