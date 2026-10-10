# Denklem 3 · yeni 80 değişkenin katkısı · 2026-10-08

Eğitim 2021-01 → 2025-04 öncesi (900,000 örnek), test 2025-04 sonrası (396,415 saat, 172 coin). LightGBM, hedef VWAP→VWAP 1 sa ve 4 sa (oynaklık biriminde). IC = saatlik coinler arası Spearman.

| Girdi kümesi | Değişken | IC 1 sa test | t | IC 1 sa son 6 ay | IC 4 sa test | t | IC 4 sa son 6 ay |
|---|---|---|---|---|---|---|---|
| tümü (207) | 194 | +0,017 | +8,3 | +0,019 | +0,002 | +0,9 | -0,001 |
| eski 127 | 119 | +0,019 | +8,9 | +0,021 | +0,007 | +3,4 | -0,001 |
| yalnız yeni 80 | 75 | +0,017 | +8,4 | +0,021 | +0,005 | +2,6 | +0,004 |
| tümü − seans açılışı | 184 | +0,018 | +8,6 | +0,022 | +0,001 | +0,5 | -0,005 |
| tümü − gün/hafta/ay yapısı 2 | 177 | +0,019 | +9,2 | +0,025 | +0,005 | +2,5 | +0,004 |
| tümü − mum kalıpları / saatlik teknikler | 177 | +0,018 | +8,6 | +0,021 | +0,005 | +2,3 | +0,002 |
| tümü − hacim 2 | 188 | +0,022 | +10,3 | +0,022 | +0,001 | +0,6 | -0,003 |
| tümü − OI / fonlama 2 | 190 | +0,016 | +7,9 | +0,017 | +0,003 | +1,3 | +0,003 |
| tümü − BTC / piyasa 2 | 187 | +0,014 | +6,8 | +0,017 | +0,003 | +1,4 | -0,003 |
| tümü − takvim | 180 | +0,020 | +9,3 | +0,022 | +0,005 | +2,2 | +0,003 |

Okuma: "tümü − grup" satırı tümünden belirgin düşükse o grup bilgi taşıyor; "yalnız yeni 80" eski 127'ye yakınsa yeni değişkenler eskilerin bilgisini başka biçimde taşıyor.

## "Tümü" modelinde en önemli 40 girdi (kazanç payı; ★ = yeni)

| # | Değişken | Pay |
|---|---|---|
| 1 | b15 | %4,8 |
| 2 | bVol | %4,5 |
| 3 | b24 | %4,5 |
| 4 | ★ bMinusAlt24 | %4,5 |
| 5 | b1 | %4,4 |
| 6 | bPos24 | %4,0 |
| 7 | b4 | %4,0 |
| 8 | ★ ethBtc24 | %3,8 |
| 9 | bPrev1 | %3,6 |
| 10 | bs50 | %3,6 |
| 11 | bs200 | %3,0 |
| 12 | ★ toWkExp | %2,5 |
| 13 | ★ bDdAth | %2,5 |
| 14 | ★ sinceHalving | %2,3 |
| 15 | ★ sinceSess | %2,0 |
| 16 | ★ toOptExp | %2,0 |
| 17 | breadth4 | %1,9 |
| 18 | ★ fromFomc | %1,8 |
| 19 | breadth1 | %1,7 |
| 20 | hr | %1,7 |
| 21 | minFund | %1,6 |
| 22 | ★ fromCpi | %1,3 |
| 23 | rng4 | %1,2 |
| 24 | top10m4 | %1,1 |
| 25 | ★ toFomc | %1,1 |
| 26 | ★ sinceDL | %1,0 |
| 27 | asiaRng | %1,0 |
| 28 | dom | %0,9 |
| 29 | eth4 | %0,9 |
| 30 | ★ toCpi | %0,9 |
| 31 | ★ sOpenRet | %0,8 |
| 32 | ★ prevSessRet | %0,8 |
| 33 | ★ fromNfp | %0,7 |
| 34 | ★ toNfp | %0,6 |
| 35 | ★ sinceDH | %0,6 |
| 36 | vwapD | %0,6 |
| 37 | sinceLo30 | %0,6 |
| 38 | disp4 | %0,6 |
| 39 | r15 | %0,6 |
| 40 | ★ asiaRet | %0,6 |

## Yeni değişkenlerin tek başına IC'si (1 sa VWAP; eğitim 1. yarı / eğitim 2. yarı / test), |IC| ≥ 0,01 ve üç dönemde aynı işaretli olanlar kalın

| Değişken | Grup | IC eğitim 1 | IC eğitim 2 | IC test | t test |
|---|---|---|---|---|---|
| **bLead15** | BTC / piyasa 2 | +0,042 | +0,033 | +0,034 | +14,9 |
| **dPos** | gün/hafta/ay yapısı 2 | -0,038 | -0,021 | -0,031 | -14,6 |
| **xsR15** | BTC / piyasa 2 | -0,040 | -0,026 | -0,031 | -15,7 |
| **cmeGap** | gün/hafta/ay yapısı 2 | -0,037 | -0,026 | -0,030 | -8,9 |
| **orBrk** | seans açılışı | -0,036 | -0,025 | -0,029 | -12,6 |
| **di14** | mum kalıpları / saatlik teknikler | -0,038 | -0,019 | -0,023 | -10,7 |
| **pdVwap** | gün/hafta/ay yapısı 2 | -0,045 | -0,024 | -0,023 | -9,5 |
| **macdH** | mum kalıpları / saatlik teknikler | -0,038 | -0,019 | -0,022 | -9,2 |
| **liqProxy** | OI / fonlama 2 | -0,011 | -0,015 | -0,020 | -3,7 |
| **vwapW** | hacim 2 | -0,036 | -0,021 | -0,019 | -8,2 |
| **pdPoc** | gün/hafta/ay yapısı 2 | -0,035 | -0,019 | -0,018 | -8,3 |
| **deltaZ** | hacim 2 | -0,028 | -0,018 | -0,018 | -9,3 |
| **bCorr7** | BTC / piyasa 2 | +0,026 | +0,024 | +0,017 | +5,3 |
| **sinceDH** | gün/hafta/ay yapısı 2 | +0,023 | +0,011 | +0,016 | +7,8 |
| **sinceDL** | gün/hafta/ay yapısı 2 | -0,019 | -0,011 | -0,014 | -7,0 |
| **r1l1** | mum kalıpları / saatlik teknikler | -0,017 | -0,012 | -0,013 | -5,5 |
| engulf | mum kalıpları / saatlik teknikler | -0,014 | -0,008 | -0,013 | -6,8 |
| **pdBrk** | gün/hafta/ay yapısı 2 | -0,020 | -0,013 | -0,011 | -5,1 |
| **orSize** | seans açılışı | -0,014 | -0,014 | -0,011 | -4,1 |
| ddAth | takvim | -0,001 | +0,000 | +0,010 | +5,1 |
| skew7 | mum kalıpları / saatlik teknikler | -0,014 | -0,014 | -0,010 | -4,9 |
| frSum7 | OI / fonlama 2 | -0,004 | +0,001 | +0,010 | +5,0 |
| vClimaxDir | hacim 2 | -0,012 | -0,009 | -0,009 | -4,9 |
| sma2050 | mum kalıpları / saatlik teknikler | -0,015 | -0,009 | -0,009 | -3,8 |
| cvdDiv | hacim 2 | +0,006 | +0,007 | +0,009 | +5,2 |
| r1l2 | mum kalıpları / saatlik teknikler | -0,012 | -0,005 | -0,009 | -3,7 |
| pwl | gün/hafta/ay yapısı 2 | -0,020 | -0,015 | -0,009 | -3,6 |
| wkPos | gün/hafta/ay yapısı 2 | -0,019 | -0,015 | -0,008 | -3,6 |
| sOpenPos | seans açılışı | -0,014 | -0,004 | -0,008 | -3,3 |
| sOpen2 | seans açılışı | -0,010 | -0,000 | -0,008 | -3,1 |
| jump24 | mum kalıpları / saatlik teknikler | -0,014 | -0,007 | -0,007 | -3,0 |
| sOpenRet | seans açılışı | -0,010 | -0,003 | -0,007 | -2,6 |
| rnd | gün/hafta/ay yapısı 2 | +0,009 | +0,002 | +0,006 | +4,0 |
| oiDay | OI / fonlama 2 | -0,018 | -0,004 | -0,006 | -3,5 |
| oiHi30 | OI / fonlama 2 | -0,003 | +0,002 | +0,006 | +2,8 |
| prevSessRet | seans açılışı | -0,017 | -0,007 | -0,006 | -2,4 |
| pwh | gün/hafta/ay yapısı 2 | -0,019 | -0,013 | -0,005 | -2,4 |
| trendDay | gün/hafta/ay yapısı 2 | -0,007 | -0,004 | +0,004 | +2,2 |
| r1l4 | mum kalıpları / saatlik teknikler | -0,006 | -0,003 | -0,004 | -1,9 |
| bBeta7 | BTC / piyasa 2 | -0,008 | -0,014 | -0,004 | -1,7 |
| pdRet | gün/hafta/ay yapısı 2 | -0,012 | -0,009 | -0,004 | -1,8 |
| asiaRet | seans açılışı | -0,014 | +0,001 | -0,004 | -1,3 |
| kurt7 | mum kalıpları / saatlik teknikler | -0,004 | +0,007 | +0,004 | +1,9 |
| vqHr | hacim 2 | -0,021 | -0,013 | -0,004 | -1,3 |
| sqz | mum kalıpları / saatlik teknikler | -0,001 | -0,003 | +0,003 | +1,6 |
| dx14 | mum kalıpları / saatlik teknikler | -0,004 | -0,001 | +0,003 | +1,3 |
| nr4 | mum kalıpları / saatlik teknikler | +0,004 | +0,003 | +0,002 | +1,2 |
| pdRng | gün/hafta/ay yapısı 2 | -0,011 | -0,005 | -0,002 | -0,9 |
| insideDay | gün/hafta/ay yapısı 2 | +0,008 | +0,007 | +0,002 | +1,1 |
| xsVol24 | BTC / piyasa 2 | -0,017 | -0,010 | -0,002 | -0,8 |
| pin | mum kalıpları / saatlik teknikler | +0,002 | -0,001 | +0,002 | +1,1 |
| pdClosePos | gün/hafta/ay yapısı 2 | -0,008 | -0,004 | -0,002 | -1,0 |
| vr | mum kalıpları / saatlik teknikler | +0,002 | -0,003 | -0,002 | -1,0 |
| r1l3 | mum kalıpları / saatlik teknikler | -0,008 | -0,008 | -0,002 | -0,7 |
| vClimax | hacim 2 | -0,016 | -0,004 | +0,001 | +0,4 |
| moOpen | gün/hafta/ay yapısı 2 | -0,015 | -0,010 | -0,001 | -0,4 |
| ldnRet | seans açılışı | -0,010 | -0,004 | -0,001 | -0,2 |
| daysAth | takvim | +0,006 | +0,011 | +0,001 | +0,2 |
| inside15 | mum kalıpları / saatlik teknikler | -0,003 | -0,001 | +0,001 | +0,3 |
| sessId | seans açılışı | — | — | — | — |
| sinceSess | seans açılışı | — | — | — | — |
| ethBtc24 | BTC / piyasa 2 | — | — | — | — |
| bMinusAlt24 | BTC / piyasa 2 | — | — | — | — |
| toFomc | takvim | — | — | — | — |
| fromFomc | takvim | — | — | — | — |
| toCpi | takvim | — | — | — | — |
| fromCpi | takvim | — | — | — | — |
| toNfp | takvim | — | — | — | — |
| fromNfp | takvim | — | — | — | — |
| evWin | takvim | — | — | — | — |
| toOptExp | takvim | — | — | — | — |
| toWkExp | takvim | — | — | — | — |
| cmeOpen | takvim | — | — | — | — |
| sinceHalving | takvim | — | — | — | — |
| bDdAth | takvim | — | — | — | — |

## Kullanıcının örneği tablo içinde: seansın ilk iki mumu önceki gün ucunun dışında (`sOpen2`)

Satır = seansın ilk saati sonrası (sinceSess ≤ 2 sa) gözlemler; hücre = sonraki 4 sa VWAP getirisi (oynaklık biriminde) ve işlem başı %, dönem dönem.

| Durum | Dönem | n | ort. 4 sa (σ birimi) | % | kazanma |
|---|---|---|---|---|---|
| iki mum da PDH üstünde → long | eğitim 1 | 22,430 | +0,030 | +0,078 | %47.8 |
| iki mum da PDH üstünde → long | eğitim 2 | 19,840 | +0,019 | +0,008 | %47.0 |
| iki mum da PDH üstünde → long | test | 13,942 | -0,021 | -0,097 | %45.8 |
| iki mum da PDL altında → short | eğitim 1 | 21,490 | +0,010 | +0,042 | %47.5 |
| iki mum da PDL altında → short | eğitim 2 | 20,906 | +0,030 | +0,045 | %48.9 |
| iki mum da PDL altında → short | test | 16,976 | -0,008 | -0,029 | %47.9 |
| içeride | eğitim 1 | 140,641 | -0,017 | -0,063 | %49.3 |
| içeride | eğitim 2 | 144,285 | -0,019 | -0,054 | %48.3 |
| içeride | test | 101,219 | -0,018 | -0,070 | %47.6 |
