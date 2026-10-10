# Denklem 4 ek · arındırılmış hedef ve coin düzeyi değişkenlerle LightGBM · 2026-10-09

874,999 saat; 38 piyasa düzeyi değişken (aynı saatte her coin için aynı; saat içi std / genel std < 0,02) çıkarıldı: b15, b1, b4, b24, bPrev1, bs50, bs200, bVol, bPos24, breadth1, breadth4, nCoins, hr, dow, sess, minFund, dom, monthEnd, fri8, weekend, sessId, sinceSess, oiDay, oiHi30, ethBtc24, bMinusAlt24, toFomc, fromFomc, toCpi, fromCpi, toNfp, fromNfp, evWin, toOptExp, toWkExp, cmeOpen, sinceHalving, bDdAth. Boşluk 2 gün. Arındırılmış hedef = coin getirisi − aynı saatteki coinlerin ortalaması. Aynı ileriye yürüyen bölünmeler (test 6 ay, 5 pencere).

| Model | Ufuk | Dönem | n | IC | t | Üst−alt onluk % | Üst onluk % | Alt onluk % |
|---|---|---|---|---|---|---|---|---|
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 4 sa | tümü | 613,220 | +0,057 | +31,3 | +0,229 | -0,000 | -0,230 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 4 sa | 1. yarı | 306,592 | +0,064 | +25,2 | +0,156 | +0,018 | -0,138 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 4 sa | 2. yarı | 306,628 | +0,051 | +19,1 | +0,299 | -0,019 | -0,318 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 4 sa | son 12 ay | 261,539 | +0,049 | +16,5 | +0,330 | -0,035 | -0,366 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 12 sa | tümü | 613,220 | +0,060 | +33,2 | +0,541 | -0,092 | -0,633 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 12 sa | 1. yarı | 306,592 | +0,071 | +28,6 | +0,355 | +0,014 | -0,340 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 12 sa | 2. yarı | 306,628 | +0,049 | +18,7 | +0,716 | -0,199 | -0,915 |
| LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) | 12 sa | son 12 ay | 261,539 | +0,042 | +14,9 | +0,794 | -0,240 | -1,034 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 4 sa | tümü | 613,220 | +0,059 | +32,1 | +0,221 | -0,004 | -0,225 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 4 sa | 1. yarı | 306,592 | +0,065 | +25,9 | +0,164 | +0,014 | -0,150 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 4 sa | 2. yarı | 306,628 | +0,052 | +19,7 | +0,275 | -0,023 | -0,297 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 4 sa | son 12 ay | 261,539 | +0,050 | +17,0 | +0,310 | -0,034 | -0,344 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 12 sa | tümü | 613,220 | +0,063 | +35,4 | +0,590 | -0,077 | -0,667 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 12 sa | 1. yarı | 306,592 | +0,071 | +28,7 | +0,409 | +0,028 | -0,380 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 12 sa | 2. yarı | 306,628 | +0,055 | +21,5 | +0,760 | -0,183 | -0,944 |
| LGB lambdarank, canlı dar (+ long/short oranları yok) | 12 sa | son 12 ay | 261,539 | +0,050 | +18,1 | +0,870 | -0,219 | -1,089 |

## Karar

4 sa: LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) +0,057 (son 12 ay +0,049) · LGB lambdarank, canlı dar (+ long/short oranları yok) +0,059 (son 12 ay +0,050)
12 sa: LGB lambdarank, canlı geniş (derinlik/1 dk/spot yok) +0,060 (son 12 ay +0,042) · LGB lambdarank, canlı dar (+ long/short oranları yok) +0,063 (son 12 ay +0,050)
