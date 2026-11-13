# Test #93: coin başına güvenli kaldıraç tavanı

Ayın ilk 50 coini, 4 saatte bir giriş, 691493 örnek, 435 coin, 2020-02 → 2026-10, Son fiyat fitili (mark fitili daha kısa; tavanlar ihtiyatlı), Tavan = 1 / (fitil + %0,5),


## Kademeye göre

| Küme | n | yön | H | %1 fitil | tavan | %0,1 fitil | tavan |
|---|---|---|---|---|---|---|---|
| 11–50 | 545914 | long | 8 sa | %15,2 | 6,4x | %33,3 | 3,0x |
| 11–50 | 545914 | long | 24 sa | %25,8 | 3,8x | %50,4 | 2,0x |
| 11–50 | 545914 | long | 72 sa | %40,2 | 2,5x | %71,4 | 1,4x |
| 11–50 | 545914 | short | 8 sa | %16,5 | 5,9x | %36,3 | 2,7x |
| 11–50 | 545914 | short | 24 sa | %29,7 | 3,3x | %69,6 | 1,4x |
| 11–50 | 545914 | short | 72 sa | %54,9 | 1,8x | %136,7 | 0,7x |
| 3–10 | 116201 | long | 8 sa | %15,6 | 6,2x | %33,8 | 2,9x |
| 3–10 | 116201 | long | 24 sa | %26,1 | 3,8x | %52,5 | 1,9x |
| 3–10 | 116201 | long | 72 sa | %40,8 | 2,4x | %69,8 | 1,4x |
| 3–10 | 116201 | short | 8 sa | %15,9 | 6,1x | %36,2 | 2,7x |
| 3–10 | 116201 | short | 24 sa | %27,9 | 3,5x | %69,6 | 1,4x |
| 3–10 | 116201 | short | 72 sa | %52,6 | 1,9x | %137,8 | 0,7x |
| BTC/ETH | 29378 | long | 8 sa | %8,8 | 10,7x | %19,6 | 5,0x |
| BTC/ETH | 29378 | long | 24 sa | %15,4 | 6,3x | %32,3 | 3,1x |
| BTC/ETH | 29378 | long | 72 sa | %24,7 | 4,0x | %54,5 | 1,8x |
| BTC/ETH | 29378 | short | 8 sa | %7,8 | 12,0x | %13,4 | 7,2x |
| BTC/ETH | 29378 | short | 24 sa | %13,1 | 7,4x | %23,5 | 4,2x |
| BTC/ETH | 29378 | short | 72 sa | %23,1 | 4,2x | %50,6 | 2,0x |

## Yıl yıl (24 sa, %1 fitil → tavan)

| Yıl | n | BTC/ETH long | short | 3–10 long | short | 11–50 long | short |
|---|---|---|---|---|---|---|---|
| 2020 | 61888 | %18,1 · 5,4x | %16,1 · 6,0x | %27,1 · 3,6x | %25,6 · 3,8x | %23,5 · 4,2x | %24,5 · 4,0x |
| 2021 | 109425 | %22,0 · 4,5x | %17,0 · 5,7x | %31,8 · 3,1x | %33,1 · 3,0x | %34,5 · 2,9x | %36,6 · 2,7x |
| 2022 | 107776 | %15,3 · 6,3x | %13,6 · 7,1x | %24,1 · 4,1x | %23,0 · 4,3x | %22,2 · 4,4x | %24,1 · 4,1x |
| 2023 | 109286 | %7,8 · 12,1x | %10,8 · 8,8x | %16,5 · 5,9x | %24,4 · 4,0x | %16,8 · 5,8x | %23,6 · 4,2x |
| 2024 | 109318 | %11,6 · 8,2x | %10,1 · 9,4x | %23,4 · 4,2x | %27,4 · 3,6x | %24,8 · 4,0x | %26,1 · 3,8x |
| 2025 | 108174 | %12,6 · 7,7x | %11,1 · 8,6x | %23,8 · 4,1x | %26,6 · 3,7x | %23,8 · 4,1x | %30,9 · 3,2x |
| 2026 | 85626 | %9,7 · 9,8x | %9,7 · 9,8x | %31,3 · 3,1x | %37,3 · 2,6x | %28,8 · 3,4x | %40,4 · 2,4x |

## Oynaklıkla ölçeklenmiş fitil (z = fitil ÷ (30 g saatlik σ · √H)), %1 ve %0,1 yüzdelik

| Dönem | yön | H | z %1 | z %0,1 |
|---|---|---|---|---|
| tümü | long | 8 sa | 3,72 | 8,73 |
| tümü | long | 24 sa | 3,72 | 7,52 |
| tümü | long | 72 sa | 3,60 | 6,97 |
| tümü | short | 8 sa | 3,79 | 7,59 |
| tümü | short | 24 sa | 3,92 | 8,26 |
| tümü | short | 72 sa | 4,31 | 9,69 |
| ilk yarı | long | 8 sa | 3,90 | 8,83 |
| ilk yarı | long | 24 sa | 3,86 | 7,10 |
| ilk yarı | long | 72 sa | 3,75 | 5,94 |
| ilk yarı | short | 8 sa | 3,78 | 7,63 |
| ilk yarı | short | 24 sa | 3,92 | 8,21 |
| ilk yarı | short | 72 sa | 4,34 | 9,49 |
| ikinci yarı | long | 8 sa | 3,53 | 8,54 |
| ikinci yarı | long | 24 sa | 3,58 | 8,22 |
| ikinci yarı | long | 72 sa | 3,42 | 8,28 |
| ikinci yarı | short | 8 sa | 3,80 | 7,53 |
| ikinci yarı | short | 24 sa | 3,92 | 8,34 |
| ikinci yarı | short | 72 sa | 4,29 | 9,95 |
| son 12 ay | long | 8 sa | 3,22 | 6,16 |
| son 12 ay | long | 24 sa | 3,11 | 5,42 |
| son 12 ay | long | 72 sa | 2,96 | 4,97 |
| son 12 ay | short | 8 sa | 3,78 | 8,04 |
| son 12 ay | short | 24 sa | 4,05 | 8,99 |
| son 12 ay | short | 72 sa | 4,73 | 11,95 |

## Formül sınaması: ilk yarının z %1 değeriyle kurulan tavanda ikinci yarıda / son 12 ayda likidasyon oranı (hedef %1)

| yön | H | ikinci yarı | son 12 ay | BTC/ETH | 11–50 |
|---|---|---|---|---|---|
| long | 8 sa | %0,77 | %0,51 | %1,11 | %0,75 |
| long | 24 sa | %0,82 | %0,46 | %1,15 | %0,80 |
| long | 72 sa | %0,78 | %0,40 | %1,53 | %0,75 |
| short | 8 sa | %1,02 | %1,00 | %0,99 | %1,02 |
| short | 24 sa | %1,00 | %1,09 | %0,88 | %1,00 |
| short | 72 sa | %0,97 | %1,21 | %1,03 | %0,94 |

## Sabit izole kaldıraçta stopsuz likidasyon olasılığı (son 12 ay)

| Kaldıraç | uzaklık | yön | 8 sa | 24 sa | 72 sa | 11–50 · 24 sa |
|---|---|---|---|---|---|---|
| 3x | %32,8 | long | %0,2 | %0,6 | %2,2 | %0,6 |
| 3x | %32,8 | short | %0,4 | %1,4 | %4,4 | %1,5 |
| 5x | %19,5 | long | %0,7 | %2,5 | %8,1 | %2,5 |
| 5x | %19,5 | short | %1,1 | %3,7 | %10,4 | %4,0 |
| 10x | %9,5 | long | %3,8 | %11,7 | %30,1 | %12,4 |
| 10x | %9,5 | short | %4,6 | %12,7 | %27,3 | %13,7 |
| 20x | %4,5 | long | %16,7 | %37,0 | %60,5 | %39,2 |
| 20x | %4,5 | short | %16,6 | %33,5 | %52,5 | %35,7 |

## Notlar

- Son 12 ayda saatlik σ medyanı %1,17; 24 sa z %1 = 3,11 (long) / 4,05 (short),
