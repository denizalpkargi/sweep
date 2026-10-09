# Test #25 · Asya kırılımını satmak, stoplu simülasyon · 2026-10-09

Ayın ilk 30 coini (319 coin), 15 dk mumlar, 2020-06 → bugün; 262.483 sinyal. Kural: kırılım yönünün tersine giriş (sonraki mumun VWAP'ı), stop kırılım mumunun ucu ± %0,15 (en az 0,8 ATR(14); "ATR+%1,5" varyantında en az %1,5; 3 ATR'yi aşarsa işlem yok), hedef 1R / 1,5R / 2R tam kapanış ya da hedefsiz, zaman stopu 4 sa (çıkış o mumun VWAP'ı). Aynı mumda stop ve hedef → stop; giriş mumunda yalnız stop sayılır. Hücre: n · brüt / **maker** / taker R (gidiş-dönüş %0,04 / %0,16 ÷ stop) · t (maker) · PF (maker) · kazanma (maker) · çıkış payları · ortalama stop %. Dönemler: 1 = 2020-06 → 05/2023, 2 = 06/2023 → bugün, Y = son 12 ay. Önceden seçilen ana varyant: ATR stop, hedef 1,5R.

## ORB Asya

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 33597 · +0,107 % · t +7,1 · 2: n 36029 · +0,140 % · t +9,5 · Y: n 10605 · +0,135 % · t +4,0

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 33516 · -0,05 / **-0,11** / -0,31 R · t -21,1 · PF 0,79 · kazanma %48 · stop %52 hedef %47 · stop %0,83 | n 35881 · -0,04 / **-0,12** / -0,36 R · t -23,5 · PF 0,78 · kazanma %48 · stop %51 hedef %47 · stop %0,73 | n 10561 · -0,04 / **-0,12** / -0,36 R · t -12,4 · PF 0,78 · kazanma %48 · stop %51 hedef %47 · stop %0,77 |
| ATR | 1,5R | n 33516 · -0,03 / **-0,10** / -0,30 R · t -15,0 · PF 0,85 · kazanma %40 · stop %59 hedef %36 · stop %0,83 | n 35881 · -0,02 / **-0,10** / -0,34 R · t -15,2 · PF 0,85 · kazanma %40 · stop %59 hedef %37 · stop %0,73 | n 10561 · -0,03 / **-0,11** / -0,36 R · t -9,6 · PF 0,83 · kazanma %39 · stop %59 hedef %37 · stop %0,77 |
| ATR | 2,0R | n 33516 · -0,01 / **-0,08** / -0,28 R · t -10,6 · PF 0,88 · kazanma %35 · stop %63 hedef %29 · stop %0,83 | n 35881 · -0,00 / **-0,08** / -0,32 R · t -11,4 · PF 0,88 · kazanma %35 · stop %63 hedef %30 · stop %0,73 | n 10561 · -0,03 / **-0,11** / -0,35 R · t -8,3 · PF 0,84 · kazanma %34 · stop %64 hedef %29 · stop %0,77 |
| ATR | yok (4 sa) | n 33516 · +0,06 / **-0,01** / -0,21 R · t -1,0 · PF 0,99 · kazanma %30 · stop %67 hedef %0 · stop %0,83 | n 35881 · +0,03 / **-0,05** / -0,29 R · t -4,5 · PF 0,94 · kazanma %28 · stop %69 hedef %0 · stop %0,73 | n 10561 · +0,01 / **-0,07** / -0,32 R · t -3,5 · PF 0,91 · kazanma %27 · stop %70 hedef %0 · stop %0,77 |
| ATR+%1,5 | 1,0R | n 27019 · +0,02 / **-0,01** / -0,09 R · t -1,4 · PF 0,98 · kazanma %51 · stop %39 hedef %40 · stop %1,57 | n 24648 · +0,03 / **+0,00** / -0,08 R · t +0,1 · PF 1,00 · kazanma %51 · stop %39 hedef %41 · stop %1,57 | n 6908 · +0,02 / **-0,01** / -0,08 R · t -0,6 · PF 0,98 · kazanma %51 · stop %39 hedef %41 · stop %1,64 |
| ATR+%1,5 | 1,5R | n 27019 · +0,03 / **+0,01** / -0,07 R · t +1,3 · PF 1,02 · kazanma %46 · stop %42 hedef %25 · stop %1,57 | n 24648 · +0,05 / **+0,02** / -0,06 R · t +3,1 · PF 1,04 · kazanma %46 · stop %42 hedef %27 · stop %1,57 | n 6908 · +0,02 / **-0,00** / -0,08 R · t -0,2 · PF 0,99 · kazanma %45 · stop %43 hedef %26 · stop %1,64 |
| ATR+%1,5 | 2,0R | n 27019 · +0,05 / **+0,03** / -0,05 R · t +3,7 · PF 1,05 · kazanma %45 · stop %43 hedef %17 · stop %1,57 | n 24648 · +0,06 / **+0,03** / -0,05 R · t +4,0 · PF 1,06 · kazanma %44 · stop %43 hedef %17 · stop %1,57 | n 6908 · +0,02 / **-0,00** / -0,08 R · t -0,1 · PF 1,00 · kazanma %43 · stop %45 hedef %17 · stop %1,64 |
| ATR+%1,5 | yok (4 sa) | n 27019 · +0,06 / **+0,04** / -0,04 R · t +4,8 · PF 1,08 · kazanma %44 · stop %43 hedef %0 · stop %1,57 | n 24648 · +0,05 / **+0,02** / -0,06 R · t +2,6 · PF 1,04 · kazanma %43 · stop %45 hedef %0 · stop %1,57 | n 6908 · +0,02 / **-0,01** / -0,08 R · t -0,4 · PF 0,99 · kazanma %41 · stop %46 hedef %0 · stop %1,64 |

## ORB Londra

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 33787 · +0,091 % · t +6,1 · 2: n 35673 · +0,056 % · t +4,0 · Y: n 10407 · +0,053 % · t +1,6

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 33698 · -0,04 / **-0,12** / -0,35 R · t -21,8 · PF 0,79 · kazanma %48 · stop %52 hedef %47 · stop %0,74 | n 35548 · -0,01 / **-0,10** / -0,36 R · t -18,0 · PF 0,83 · kazanma %50 · stop %50 hedef %49 · stop %0,68 | n 10347 · -0,02 / **-0,11** / -0,37 R · t -10,8 · PF 0,81 · kazanma %49 · stop %50 hedef %48 · stop %0,76 |
| ATR | 1,5R | n 33698 · -0,02 / **-0,10** / -0,33 R · t -15,4 · PF 0,84 · kazanma %39 · stop %60 hedef %38 · stop %0,74 | n 35548 · -0,00 / **-0,09** / -0,35 R · t -14,3 · PF 0,86 · kazanma %40 · stop %59 hedef %38 · stop %0,68 | n 10347 · -0,01 / **-0,10** / -0,36 R · t -8,1 · PF 0,85 · kazanma %40 · stop %59 hedef %38 · stop %0,76 |
| ATR | 2,0R | n 33698 · -0,02 / **-0,10** / -0,33 R · t -13,0 · PF 0,86 · kazanma %34 · stop %65 hedef %30 · stop %0,74 | n 35548 · -0,01 / **-0,09** / -0,35 R · t -12,8 · PF 0,87 · kazanma %35 · stop %64 hedef %30 · stop %0,68 | n 10347 · -0,01 / **-0,10** / -0,37 R · t -7,6 · PF 0,85 · kazanma %34 · stop %64 hedef %30 · stop %0,76 |
| ATR | yok (4 sa) | n 33698 · +0,01 / **-0,06** / -0,29 R · t -5,5 · PF 0,92 · kazanma %26 · stop %72 hedef %0 · stop %0,74 | n 35548 · -0,00 / **-0,09** / -0,35 R · t -8,1 · PF 0,89 · kazanma %27 · stop %71 hedef %0 · stop %0,68 | n 10347 · -0,03 / **-0,12** / -0,38 R · t -5,9 · PF 0,84 · kazanma %27 · stop %71 hedef %0 · stop %0,76 |
| ATR+%1,5 | 1,0R | n 24017 · +0,02 / **-0,00** / -0,08 R · t -0,5 · PF 0,99 · kazanma %51 · stop %42 hedef %43 · stop %1,57 | n 22674 · +0,01 / **-0,01** / -0,09 R · t -1,9 · PF 0,97 · kazanma %50 · stop %40 hedef %41 · stop %1,57 | n 6233 · +0,01 / **-0,02** / -0,09 R · t -1,4 · PF 0,96 · kazanma %51 · stop %41 hedef %41 · stop %1,68 |
| ATR+%1,5 | 1,5R | n 24017 · +0,02 / **-0,00** / -0,08 R · t -0,6 · PF 0,99 · kazanma %45 · stop %46 hedef %28 · stop %1,57 | n 22674 · +0,02 / **-0,01** / -0,09 R · t -1,4 · PF 0,98 · kazanma %45 · stop %44 hedef %26 · stop %1,57 | n 6233 · +0,00 / **-0,02** / -0,10 R · t -1,8 · PF 0,95 · kazanma %45 · stop %45 hedef %25 · stop %1,68 |
| ATR+%1,5 | 2,0R | n 24017 · +0,02 / **-0,00** / -0,08 R · t -0,6 · PF 0,99 · kazanma %43 · stop %48 hedef %18 · stop %1,57 | n 22674 · +0,02 / **-0,00** / -0,08 R · t -0,3 · PF 1,00 · kazanma %43 · stop %45 hedef %16 · stop %1,57 | n 6233 · -0,01 / **-0,03** / -0,11 R · t -2,1 · PF 0,94 · kazanma %43 · stop %46 hedef %16 · stop %1,68 |
| ATR+%1,5 | yok (4 sa) | n 24017 · +0,03 / **+0,00** / -0,08 R · t +0,1 · PF 1,00 · kazanma %41 · stop %49 hedef %0 · stop %1,57 | n 22674 · +0,02 / **-0,01** / -0,09 R · t -1,0 · PF 0,98 · kazanma %42 · stop %46 hedef %0 · stop %1,57 | n 6233 · -0,01 / **-0,04** / -0,11 R · t -2,0 · PF 0,93 · kazanma %41 · stop %48 hedef %0 · stop %1,68 |

## ORB New York

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 34320 · +0,167 % · t +8,9 · 2: n 36400 · +0,061 % · t +3,5 · Y: n 10720 · -0,001 % · t -0,0

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 34155 · -0,05 / **-0,12** / -0,32 R · t -22,0 · PF 0,79 · kazanma %47 · stop %52 hedef %47 · stop %0,84 | n 36187 · -0,03 / **-0,11** / -0,35 R · t -21,5 · PF 0,80 · kazanma %48 · stop %51 hedef %48 · stop %0,74 | n 10665 · -0,07 / **-0,16** / -0,40 R · t -16,1 · PF 0,73 · kazanma %46 · stop %53 hedef %46 · stop %0,80 |
| ATR | 1,5R | n 34155 · -0,04 / **-0,11** / -0,31 R · t -17,0 · PF 0,83 · kazanma %39 · stop %60 hedef %37 · stop %0,84 | n 36187 · -0,02 / **-0,10** / -0,34 R · t -16,2 · PF 0,84 · kazanma %39 · stop %60 hedef %38 · stop %0,74 | n 10665 · -0,05 / **-0,13** / -0,38 R · t -11,5 · PF 0,80 · kazanma %38 · stop %61 hedef %37 · stop %0,80 |
| ATR | 2,0R | n 34155 · -0,04 / **-0,10** / -0,31 R · t -14,1 · PF 0,85 · kazanma %34 · stop %65 hedef %30 · stop %0,84 | n 36187 · -0,02 / **-0,10** / -0,34 R · t -13,7 · PF 0,86 · kazanma %34 · stop %66 hedef %31 · stop %0,74 | n 10665 · -0,06 / **-0,14** / -0,39 R · t -10,7 · PF 0,80 · kazanma %32 · stop %67 hedef %29 · stop %0,80 |
| ATR | yok (4 sa) | n 34155 · -0,00 / **-0,07** / -0,27 R · t -6,0 · PF 0,91 · kazanma %25 · stop %73 hedef %0 · stop %0,84 | n 36187 · -0,00 / **-0,08** / -0,32 R · t -6,7 · PF 0,90 · kazanma %23 · stop %76 hedef %0 · stop %0,74 | n 10665 · -0,05 / **-0,13** / -0,38 R · t -5,7 · PF 0,85 · kazanma %22 · stop %76 hedef %0 · stop %0,80 |
| ATR+%1,5 | 1,0R | n 26835 · +0,02 / **-0,00** / -0,08 R · t -0,8 · PF 0,99 · kazanma %51 · stop %43 hedef %45 · stop %1,59 | n 24815 · +0,04 / **+0,01** / -0,07 R · t +1,8 · PF 1,02 · kazanma %52 · stop %43 hedef %47 · stop %1,58 | n 6780 · +0,02 / **-0,00** / -0,08 R · t -0,4 · PF 0,99 · kazanma %51 · stop %44 hedef %46 · stop %1,68 |
| ATR+%1,5 | 1,5R | n 26835 · +0,03 / **+0,00** / -0,07 R · t +0,7 · PF 1,01 · kazanma %45 · stop %48 hedef %30 · stop %1,59 | n 24815 · +0,04 / **+0,01** / -0,07 R · t +1,7 · PF 1,02 · kazanma %44 · stop %49 hedef %32 · stop %1,58 | n 6780 · +0,02 / **-0,01** / -0,08 R · t -0,5 · PF 0,99 · kazanma %43 · stop %50 hedef %32 · stop %1,68 |
| ATR+%1,5 | 2,0R | n 26835 · +0,03 / **+0,01** / -0,07 R · t +0,9 · PF 1,01 · kazanma %42 · stop %50 hedef %21 · stop %1,59 | n 24815 · +0,04 / **+0,01** / -0,06 R · t +1,6 · PF 1,02 · kazanma %41 · stop %52 hedef %22 · stop %1,58 | n 6780 · +0,02 / **-0,01** / -0,08 R · t -0,6 · PF 0,98 · kazanma %40 · stop %53 hedef %22 · stop %1,68 |
| ATR+%1,5 | yok (4 sa) | n 26835 · +0,02 / **-0,00** / -0,08 R · t -0,3 · PF 1,00 · kazanma %40 · stop %52 hedef %0 · stop %1,59 | n 24815 · +0,03 / **+0,00** / -0,08 R · t +0,3 · PF 1,00 · kazanma %38 · stop %54 hedef %0 · stop %1,58 | n 6780 · +0,04 / **+0,01** / -0,07 R · t +0,5 · PF 1,02 · kazanma %37 · stop %55 hedef %0 · stop %1,68 |

## PDH/PDL Asya 00–07

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 14260 · +0,230 % · t +8,8 · 2: n 14563 · +0,231 % · t +8,4 · Y: n 4066 · +0,215 % · t +3,2

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 14150 · -0,11 / **-0,17** / -0,34 R · t -20,5 · PF 0,71 · kazanma %45 · stop %54 hedef %43 · stop %0,98 | n 14280 · -0,13 / **-0,19** / -0,39 R · t -23,5 · PF 0,67 · kazanma %44 · stop %55 hedef %42 · stop %0,89 | n 3984 · -0,13 / **-0,20** / -0,41 R · t -12,9 · PF 0,66 · kazanma %44 · stop %55 hedef %42 · stop %0,95 |
| ATR | 1,5R | n 14150 · -0,08 / **-0,14** / -0,31 R · t -14,0 · PF 0,79 · kazanma %38 · stop %60 hedef %33 · stop %0,98 | n 14280 · -0,11 / **-0,18** / -0,38 R · t -18,4 · PF 0,73 · kazanma %37 · stop %62 hedef %32 · stop %0,89 | n 3984 · -0,12 / **-0,19** / -0,40 R · t -10,2 · PF 0,72 · kazanma %36 · stop %62 hedef %32 · stop %0,95 |
| ATR | 2,0R | n 14150 · -0,06 / **-0,12** / -0,29 R · t -10,7 · PF 0,83 · kazanma %35 · stop %64 hedef %25 · stop %0,98 | n 14280 · -0,10 / **-0,17** / -0,37 R · t -15,2 · PF 0,76 · kazanma %33 · stop %65 hedef %25 · stop %0,89 | n 3984 · -0,12 / **-0,18** / -0,39 R · t -9,0 · PF 0,74 · kazanma %32 · stop %66 hedef %25 · stop %0,95 |
| ATR | yok (4 sa) | n 14150 · -0,03 / **-0,09** / -0,26 R · t -6,1 · PF 0,88 · kazanma %31 · stop %67 hedef %0 · stop %0,98 | n 14280 · -0,07 / **-0,14** / -0,34 R · t -9,3 · PF 0,82 · kazanma %28 · stop %69 hedef %0 · stop %0,89 | n 3984 · -0,12 / **-0,18** / -0,39 R · t -6,6 · PF 0,76 · kazanma %27 · stop %70 hedef %0 · stop %0,95 |
| ATR+%1,5 | 1,0R | n 12165 · +0,05 / **+0,02** / -0,05 R · t +2,8 · PF 1,05 · kazanma %54 · stop %41 hedef %43 · stop %1,63 | n 10974 · -0,01 / **-0,04** / -0,11 R · t -4,3 · PF 0,92 · kazanma %50 · stop %43 hedef %40 · stop %1,64 | n 2896 · -0,02 / **-0,05** / -0,12 R · t -2,8 · PF 0,90 · kazanma %49 · stop %43 hedef %39 · stop %1,74 |
| ATR+%1,5 | 1,5R | n 12165 · +0,05 / **+0,03** / -0,05 R · t +2,8 · PF 1,06 · kazanma %49 · stop %45 hedef %25 · stop %1,63 | n 10974 · +0,01 / **-0,02** / -0,09 R · t -1,7 · PF 0,97 · kazanma %46 · stop %46 hedef %25 · stop %1,64 | n 2896 · -0,01 / **-0,04** / -0,11 R · t -1,9 · PF 0,92 · kazanma %45 · stop %46 hedef %24 · stop %1,74 |
| ATR+%1,5 | 2,0R | n 12165 · +0,06 / **+0,04** / -0,04 R · t +3,6 · PF 1,08 · kazanma %47 · stop %46 hedef %15 · stop %1,63 | n 10974 · +0,02 / **-0,01** / -0,08 R · t -0,7 · PF 0,98 · kazanma %44 · stop %47 hedef %16 · stop %1,64 | n 2896 · -0,02 / **-0,04** / -0,12 R · t -2,1 · PF 0,91 · kazanma %42 · stop %48 hedef %15 · stop %1,74 |
| ATR+%1,5 | yok (4 sa) | n 12165 · +0,07 / **+0,05** / -0,03 R · t +4,0 · PF 1,09 · kazanma %46 · stop %47 hedef %0 · stop %1,63 | n 10974 · +0,04 / **+0,01** / -0,06 R · t +1,1 · PF 1,03 · kazanma %43 · stop %48 hedef %0 · stop %1,64 | n 2896 · -0,02 / **-0,04** / -0,12 R · t -1,6 · PF 0,92 · kazanma %41 · stop %49 hedef %0 · stop %1,74 |

## PDH/PDL Londra 07–12

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 4494 · +0,106 % · t +2,4 · 2: n 4881 · +0,170 % · t +3,8 · Y: n 1440 · -0,015 % · t -0,1

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 4414 · -0,26 / **-0,32** / -0,51 R · t -22,3 · PF 0,51 · kazanma %37 · stop %62 hedef %36 · stop %0,89 | n 4784 · -0,16 / **-0,23** / -0,45 R · t -16,4 · PF 0,62 · kazanma %42 · stop %57 hedef %41 · stop %0,81 | n 1415 · -0,16 / **-0,23** / -0,44 R · t -8,8 · PF 0,63 · kazanma %42 · stop %57 hedef %41 · stop %0,92 |
| ATR | 1,5R | n 4414 · -0,27 / **-0,34** / -0,52 R · t -20,1 · PF 0,54 · kazanma %30 · stop %69 hedef %27 · stop %0,89 | n 4784 · -0,17 / **-0,25** / -0,47 R · t -14,8 · PF 0,65 · kazanma %34 · stop %64 hedef %31 · stop %0,81 | n 1415 · -0,17 / **-0,24** / -0,46 R · t -7,9 · PF 0,65 · kazanma %34 · stop %65 hedef %31 · stop %0,92 |
| ATR | 2,0R | n 4414 · -0,26 / **-0,32** / -0,51 R · t -17,4 · PF 0,58 · kazanma %27 · stop %72 hedef %21 · stop %0,89 | n 4784 · -0,18 / **-0,25** / -0,47 R · t -13,4 · PF 0,66 · kazanma %29 · stop %68 hedef %24 · stop %0,81 | n 1415 · -0,20 / **-0,27** / -0,48 R · t -8,0 · PF 0,64 · kazanma %29 · stop %69 hedef %23 · stop %0,92 |
| ATR | yok (4 sa) | n 4414 · -0,27 / **-0,33** / -0,52 R · t -13,3 · PF 0,59 · kazanma %22 · stop %76 hedef %0 · stop %0,89 | n 4784 · -0,12 / **-0,20** / -0,42 R · t -6,7 · PF 0,75 · kazanma %24 · stop %73 hedef %0 · stop %0,81 | n 1415 · -0,21 / **-0,28** / -0,50 R · t -4,5 · PF 0,65 · kazanma %23 · stop %75 hedef %0 · stop %0,92 |
| ATR+%1,5 | 1,0R | n 3585 · -0,07 / **-0,10** / -0,18 R · t -6,3 · PF 0,81 · kazanma %47 · stop %49 hedef %40 · stop %1,60 | n 3326 · -0,06 / **-0,09** / -0,16 R · t -5,4 · PF 0,82 · kazanma %47 · stop %46 hedef %39 · stop %1,62 | n 941 · -0,10 / **-0,12** / -0,20 R · t -4,1 · PF 0,76 · kazanma %45 · stop %49 hedef %38 · stop %1,73 |
| ATR+%1,5 | 1,5R | n 3585 · -0,06 / **-0,09** / -0,16 R · t -4,8 · PF 0,84 · kazanma %42 · stop %53 hedef %26 · stop %1,60 | n 3326 · -0,06 / **-0,08** / -0,16 R · t -4,4 · PF 0,85 · kazanma %41 · stop %50 hedef %25 · stop %1,62 | n 941 · -0,15 / **-0,18** / -0,25 R · t -5,2 · PF 0,69 · kazanma %37 · stop %54 hedef %23 · stop %1,73 |
| ATR+%1,5 | 2,0R | n 3585 · -0,06 / **-0,08** / -0,16 R · t -4,2 · PF 0,86 · kazanma %40 · stop %54 hedef %16 · stop %1,60 | n 3326 · -0,05 / **-0,07** / -0,15 R · t -3,6 · PF 0,87 · kazanma %40 · stop %51 hedef %16 · stop %1,62 | n 941 · -0,15 / **-0,18** / -0,25 R · t -4,8 · PF 0,71 · kazanma %35 · stop %56 hedef %15 · stop %1,73 |
| ATR+%1,5 | yok (4 sa) | n 3585 · -0,07 / **-0,10** / -0,17 R · t -4,6 · PF 0,83 · kazanma %39 · stop %55 hedef %0 · stop %1,60 | n 3326 · -0,02 / **-0,04** / -0,12 R · t -1,7 · PF 0,92 · kazanma %38 · stop %52 hedef %0 · stop %1,62 | n 941 · -0,14 / **-0,17** / -0,24 R · t -3,2 · PF 0,73 · kazanma %33 · stop %57 hedef %0 · stop %1,73 |

## PDH/PDL New York 12–21

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 5844 · +0,042 % · t +1,0 · 2: n 6874 · +0,039 % · t +0,9 · Y: n 2135 · -0,066 % · t -0,7

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 5735 · -0,20 / **-0,26** / -0,43 R · t -20,4 · PF 0,58 · kazanma %40 · stop %59 hedef %38 · stop %0,99 | n 6742 · -0,17 / **-0,23** / -0,42 R · t -19,3 · PF 0,63 · kazanma %42 · stop %57 hedef %40 · stop %0,95 | n 2107 · -0,17 / **-0,23** / -0,43 R · t -10,8 · PF 0,63 · kazanma %42 · stop %57 hedef %40 · stop %0,99 |
| ATR | 1,5R | n 5735 · -0,21 / **-0,26** / -0,43 R · t -17,7 · PF 0,62 · kazanma %33 · stop %65 hedef %28 · stop %0,99 | n 6742 · -0,16 / **-0,23** / -0,42 R · t -16,2 · PF 0,67 · kazanma %35 · stop %64 hedef %30 · stop %0,95 | n 2107 · -0,15 / **-0,21** / -0,41 R · t -8,4 · PF 0,69 · kazanma %36 · stop %63 hedef %31 · stop %0,99 |
| ATR | 2,0R | n 5735 · -0,20 / **-0,26** / -0,43 R · t -15,7 · PF 0,65 · kazanma %30 · stop %68 hedef %21 · stop %0,99 | n 6742 · -0,17 / **-0,23** / -0,42 R · t -14,8 · PF 0,68 · kazanma %31 · stop %67 hedef %22 · stop %0,95 | n 2107 · -0,15 / **-0,21** / -0,41 R · t -7,6 · PF 0,70 · kazanma %32 · stop %67 hedef %22 · stop %0,99 |
| ATR | yok (4 sa) | n 5735 · -0,21 / **-0,26** / -0,43 R · t -12,2 · PF 0,66 · kazanma %25 · stop %72 hedef %0 · stop %0,99 | n 6742 · -0,19 / **-0,26** / -0,45 R · t -13,0 · PF 0,67 · kazanma %26 · stop %71 hedef %0 · stop %0,95 | n 2107 · -0,16 / **-0,23** / -0,42 R · t -6,3 · PF 0,70 · kazanma %27 · stop %71 hedef %0 · stop %0,99 |
| ATR+%1,5 | 1,0R | n 4847 · -0,06 / **-0,09** / -0,16 R · t -6,5 · PF 0,82 · kazanma %48 · stop %47 hedef %38 · stop %1,63 | n 5331 · -0,03 / **-0,06** / -0,13 R · t -4,5 · PF 0,88 · kazanma %49 · stop %44 hedef %40 · stop %1,66 | n 1602 · -0,03 / **-0,06** / -0,13 R · t -2,4 · PF 0,88 · kazanma %49 · stop %44 hedef %40 · stop %1,72 |
| ATR+%1,5 | 1,5R | n 4847 · -0,07 / **-0,09** / -0,17 R · t -6,0 · PF 0,83 · kazanma %43 · stop %50 hedef %23 · stop %1,63 | n 5331 · -0,02 / **-0,05** / -0,13 R · t -3,4 · PF 0,90 · kazanma %43 · stop %48 hedef %26 · stop %1,66 | n 1602 · -0,02 / **-0,04** / -0,12 R · t -1,6 · PF 0,91 · kazanma %44 · stop %48 hedef %26 · stop %1,72 |
| ATR+%1,5 | 2,0R | n 4847 · -0,07 / **-0,09** / -0,17 R · t -5,8 · PF 0,83 · kazanma %41 · stop %52 hedef %14 · stop %1,63 | n 5331 · -0,03 / **-0,06** / -0,13 R · t -3,6 · PF 0,90 · kazanma %41 · stop %50 hedef %16 · stop %1,66 | n 1602 · -0,02 / **-0,04** / -0,12 R · t -1,5 · PF 0,92 · kazanma %42 · stop %50 hedef %16 · stop %1,72 |
| ATR+%1,5 | yok (4 sa) | n 4847 · -0,08 / **-0,11** / -0,19 R · t -6,2 · PF 0,81 · kazanma %39 · stop %53 hedef %0 · stop %1,63 | n 5331 · -0,04 / **-0,07** / -0,14 R · t -3,7 · PF 0,88 · kazanma %39 · stop %51 hedef %0 · stop %1,66 | n 1602 · -0,01 / **-0,03** / -0,11 R · t -1,0 · PF 0,94 · kazanma %40 · stop %51 hedef %0 · stop %1,72 |

## PDH/PDL Gece 21–24

Stopsuz karşılaştırma (giriş VWAP → +4 sa VWAP, ters yön, maliyetsiz): 1: n 857 · -0,045 % · t -0,4 · 2: n 904 · +0,166 % · t +1,8 · Y: n 230 · +0,287 % · t +1,5

| Stop | Hedef | 1. dönem | 2. dönem | Son 12 ay |
|---|---|---|---|---|
| ATR | 1,0R | n 828 · -0,24 / **-0,30** / -0,49 R · t -9,1 · PF 0,53 · kazanma %38 · stop %61 hedef %36 · stop %1,01 | n 859 · -0,13 / **-0,20** / -0,42 R · t -6,0 · PF 0,67 · kazanma %44 · stop %56 hedef %43 · stop %0,79 | n 221 · -0,14 / **-0,21** / -0,42 R · t -3,1 · PF 0,66 · kazanma %43 · stop %56 hedef %43 · stop %0,82 |
| ATR | 1,5R | n 828 · -0,25 / **-0,31** / -0,50 R · t -8,1 · PF 0,56 · kazanma %32 · stop %67 hedef %26 · stop %1,01 | n 859 · -0,12 / **-0,19** / -0,41 R · t -4,7 · PF 0,72 · kazanma %36 · stop %63 hedef %33 · stop %0,79 | n 221 · -0,19 / **-0,26** / -0,47 R · t -3,3 · PF 0,63 · kazanma %33 · stop %64 hedef %29 · stop %0,82 |
| ATR | 2,0R | n 828 · -0,25 / **-0,31** / -0,50 R · t -7,4 · PF 0,58 · kazanma %29 · stop %70 hedef %19 · stop %1,01 | n 859 · -0,10 / **-0,17** / -0,39 R · t -3,9 · PF 0,76 · kazanma %32 · stop %67 hedef %25 · stop %0,79 | n 221 · -0,14 / **-0,21** / -0,43 R · t -2,5 · PF 0,70 · kazanma %32 · stop %66 hedef %23 · stop %0,82 |
| ATR | yok (4 sa) | n 828 · -0,24 / **-0,30** / -0,48 R · t -5,3 · PF 0,62 · kazanma %25 · stop %74 hedef %0 · stop %1,01 | n 859 · -0,15 / **-0,23** / -0,44 R · t -4,0 · PF 0,71 · kazanma %26 · stop %73 hedef %0 · stop %0,79 | n 221 · -0,27 / **-0,34** / -0,55 R · t -3,7 · PF 0,56 · kazanma %27 · stop %71 hedef %0 · stop %0,82 |
| ATR+%1,5 | 1,0R | n 651 · -0,16 / **-0,18** / -0,26 R · t -5,0 · PF 0,67 · kazanma %43 · stop %53 hedef %35 · stop %1,70 | n 609 · -0,01 / **-0,04** / -0,11 R · t -0,9 · PF 0,93 · kazanma %50 · stop %46 hedef %43 · stop %1,56 | n 157 · -0,02 / **-0,05** / -0,13 R · t -0,7 · PF 0,90 · kazanma %48 · stop %45 hedef %43 · stop %1,59 |
| ATR+%1,5 | 1,5R | n 651 · -0,18 / **-0,20** / -0,27 R · t -5,0 · PF 0,66 · kazanma %39 · stop %57 hedef %20 · stop %1,70 | n 609 · -0,01 / **-0,04** / -0,12 R · t -0,8 · PF 0,93 · kazanma %44 · stop %50 hedef %27 · stop %1,56 | n 157 · -0,01 / **-0,03** / -0,11 R · t -0,4 · PF 0,93 · kazanma %44 · stop %48 hedef %26 · stop %1,59 |
| ATR+%1,5 | 2,0R | n 651 · -0,16 / **-0,18** / -0,26 R · t -4,2 · PF 0,70 · kazanma %37 · stop %57 hedef %13 · stop %1,70 | n 609 · +0,00 / **-0,02** / -0,10 R · t -0,5 · PF 0,96 · kazanma %42 · stop %52 hedef %17 · stop %1,56 | n 157 · +0,02 / **-0,00** / -0,08 R · t -0,0 · PF 1,00 · kazanma %43 · stop %48 hedef %18 · stop %1,59 |
| ATR+%1,5 | yok (4 sa) | n 651 · -0,11 / **-0,14** / -0,21 R · t -2,6 · PF 0,77 · kazanma %37 · stop %58 hedef %0 · stop %1,70 | n 609 · +0,02 / **-0,00** / -0,08 R · t -0,1 · PF 0,99 · kazanma %41 · stop %53 hedef %0 · stop %1,56 | n 157 · +0,04 / **+0,01** / -0,06 R · t +0,1 · PF 1,02 · kazanma %42 · stop %50 hedef %0 · stop %1,59 |

## Yıl yıl · ana varyant (ATR stop, hedef 1,5R)

| Sinyal | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|
| ORB Asya | 7955 · -0,14 R | 10674 · -0,10 R | 10491 · -0,06 R | 10658 · -0,11 R | 10793 · -0,09 R | 10695 · -0,07 R | 8131 · -0,12 R |
| PDH/PDL Asya 00–07 | 2987 · -0,18 R | 4907 · -0,11 R | 4664 · -0,14 R | 3851 · -0,16 R | 4528 · -0,17 R | 4388 · -0,19 R | 3105 · -0,19 R |
| ORB Londra | 8047 · -0,12 R | 10794 · -0,10 R | 10493 · -0,11 R | 10612 · -0,08 R | 10709 · -0,10 R | 10608 · -0,07 R | 7983 · -0,11 R |
| ORB New York | 8109 · -0,10 R | 10867 · -0,08 R | 10732 · -0,13 R | 10781 · -0,13 R | 10867 · -0,10 R | 10740 · -0,05 R | 8246 · -0,15 R |

