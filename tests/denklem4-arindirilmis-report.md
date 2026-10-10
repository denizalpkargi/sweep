# Denklem 4 ek · arındırılmış hedef ve coin düzeyi değişkenlerle LightGBM · 2026-10-09

874,999 saat; 38 piyasa düzeyi değişken (aynı saatte her coin için aynı; saat içi std / genel std < 0,02) çıkarıldı: b15, b1, b4, b24, bPrev1, bs50, bs200, bVol, bPos24, breadth1, breadth4, nCoins, hr, dow, sess, minFund, dom, monthEnd, fri8, weekend, sessId, sinceSess, oiDay, oiHi30, ethBtc24, bMinusAlt24, toFomc, fromFomc, toCpi, fromCpi, toNfp, fromNfp, evWin, toOptExp, toWkExp, cmeOpen, sinceHalving, bDdAth. Arındırılmış hedef = coin getirisi − aynı saatteki coinlerin ortalaması. Aynı ileriye yürüyen bölünmeler (test 6 ay, 5 pencere).

| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % | Üst onluk % | Alt onluk % |
|---|---|---|---|---|---|---|---|---|
| LGB ham hedef, tüm değişkenler | 4 sa | tümü | 613,220 | +0,009 | +5,1 | +0,142 | -0,041 | -0,183 |
| LGB ham hedef, tüm değişkenler | 4 sa | 1. yarı | 306,592 | +0,009 | +3,9 | +0,077 | -0,019 | -0,096 |
| LGB ham hedef, tüm değişkenler | 4 sa | 2. yarı | 306,628 | +0,008 | +3,3 | +0,204 | -0,063 | -0,267 |
| LGB ham hedef, tüm değişkenler | 4 sa | son 12 ay | 261,539 | +0,009 | +3,2 | +0,239 | -0,084 | -0,323 |
| LGB ham hedef, tüm değişkenler | 12 sa | tümü | 613,220 | +0,022 | +12,1 | +0,488 | -0,050 | -0,537 |
| LGB ham hedef, tüm değişkenler | 12 sa | 1. yarı | 306,592 | +0,025 | +9,9 | +0,207 | -0,007 | -0,214 |
| LGB ham hedef, tüm değişkenler | 12 sa | 2. yarı | 306,628 | +0,019 | +7,2 | +0,756 | -0,093 | -0,849 |
| LGB ham hedef, tüm değişkenler | 12 sa | son 12 ay | 261,539 | +0,018 | +6,0 | +0,806 | -0,149 | -0,955 |
| LGB arındırılmış hedef, tüm değişkenler | 4 sa | tümü | 613,220 | +0,030 | +18,4 | +0,269 | -0,016 | -0,285 |
| LGB arındırılmış hedef, tüm değişkenler | 4 sa | 1. yarı | 306,592 | +0,035 | +15,2 | +0,149 | -0,002 | -0,150 |
| LGB arındırılmış hedef, tüm değişkenler | 4 sa | 2. yarı | 306,628 | +0,025 | +10,8 | +0,385 | -0,030 | -0,415 |
| LGB arındırılmış hedef, tüm değişkenler | 4 sa | son 12 ay | 261,539 | +0,024 | +9,2 | +0,431 | -0,051 | -0,482 |
| LGB arındırılmış hedef, tüm değişkenler | 12 sa | tümü | 613,220 | +0,039 | +22,7 | +0,704 | -0,080 | -0,784 |
| LGB arındırılmış hedef, tüm değişkenler | 12 sa | 1. yarı | 306,592 | +0,047 | +19,6 | +0,304 | -0,036 | -0,341 |
| LGB arındırılmış hedef, tüm değişkenler | 12 sa | 2. yarı | 306,628 | +0,031 | +12,6 | +1,087 | -0,124 | -1,211 |
| LGB arındırılmış hedef, tüm değişkenler | 12 sa | son 12 ay | 261,539 | +0,025 | +9,1 | +1,188 | -0,187 | -1,376 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 4 sa | tümü | 613,220 | +0,027 | +16,4 | +0,246 | -0,032 | -0,278 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 4 sa | 1. yarı | 306,592 | +0,031 | +13,6 | +0,118 | -0,010 | -0,128 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 4 sa | 2. yarı | 306,628 | +0,024 | +9,7 | +0,368 | -0,054 | -0,422 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 4 sa | son 12 ay | 261,539 | +0,023 | +8,8 | +0,413 | -0,078 | -0,491 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 12 sa | tümü | 613,220 | +0,038 | +22,0 | +0,739 | -0,079 | -0,818 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 12 sa | 1. yarı | 306,592 | +0,047 | +20,5 | +0,322 | -0,035 | -0,357 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 12 sa | 2. yarı | 306,628 | +0,029 | +11,2 | +1,138 | -0,124 | -1,262 |
| LGB arındırılmış hedef, yalnız coin değişkenleri | 12 sa | son 12 ay | 261,539 | +0,022 | +7,7 | +1,238 | -0,204 | -1,442 |

## Karar

4 sa: LGB ham hedef, tüm değişkenler +0,009 (son 12 ay +0,009) · LGB arındırılmış hedef, tüm değişkenler +0,030 (son 12 ay +0,024) · LGB arındırılmış hedef, yalnız coin değişkenleri +0,027 (son 12 ay +0,023)
12 sa: LGB ham hedef, tüm değişkenler +0,022 (son 12 ay +0,018) · LGB arındırılmış hedef, tüm değişkenler +0,039 (son 12 ay +0,025) · LGB arındırılmış hedef, yalnız coin değişkenleri +0,038 (son 12 ay +0,022)
