# Test #1 · Tam Kaplumbağa sistemi

Arşiv günlük mumları, 2020-06 → 2026-10. Birim = özsermayenin %0'i ÷ N, stop 2N (birim başına %2 risk), coin başına 4, aynı yönde toplam 6 birim, nominal ≤ 4x. Maliyet taraf başına %0,08 + arşiv fonlaması. R = işlem sonucu ÷ ilk birimin riski. "1. yarı / 2. yarı / son 24 ay" sütunları portföyün yıllık getirisi; R sütunları işlem ortalaması. Kural: `node tests/test01-tam-turtle.js`.

| Kurulum | İşlem | Ort. R | t | Kazanma | Medyan R | En iyi %5 hariç | R 1. yarı | R 2. yarı | R son 24 ay | Yıllık | Düşüş | Yıllık 1. yarı | Yıllık 2. yarı | Yıllık son 24 ay | Son 12 ay |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 coin · gün içi · long · süzgeçsiz · tam | 142 | +1,73 | +1,7 | %30 | −1,02 | −0,30 | +2,24 | +1,27 | −0,09 | +16% | −18% | +20% | +12% | −2% | −6% |
| 4 coin · gün içi · long · süzgeçsiz · tam−atlama | 181 | +1,16 | +2,2 | %27 | −1,01 | −0,31 | +1,48 | +0,86 | −0,15 | +15% | −25% | +20% | +10% | −3% | −9% |
| 4 coin · gün içi · long · süzgeçsiz · tam−piramit | 158 | +1,38 | +3,0 | %44 | −0,21 | +0,32 | +1,91 | +0,89 | +0,43 | +16% | −14% | +22% | +11% | +6% | −0% |
| 4 coin · gün içi · long · süzgeçsiz · D20/10 | 198 | +0,86 | +3,3 | %41 | −0,29 | +0,23 | +1,09 | +0,67 | +0,26 | +13% | −10% | +16% | +11% | +4% | −1% |
| 4 coin · gün içi · long · BTC SMA200 · tam | 96 | +3,26 | +2,0 | %38 | −0,82 | +0,27 | +3,44 | +3,07 | +0,63 | +22% | −20% | +24% | +21% | +4% | −4% |
| 4 coin · gün içi · long · BTC SMA200 · tam−atlama | 116 | +2,44 | +2,4 | %34 | −0,96 | +0,43 | +2,61 | +2,26 | +0,27 | +21% | −20% | +25% | +18% | +2% | −3% |
| 4 coin · gün içi · long · BTC SMA200 · tam−piramit | 113 | +1,84 | +2,9 | %50 | +0,03 | +0,48 | +2,53 | +1,20 | +0,65 | +16% | −14% | +21% | +11% | +5% | −1% |
| 4 coin · gün içi · long · BTC SMA200 · D20/10 | 122 | +0,71 | +2,4 | %41 | −0,42 | +0,13 | +1,16 | +0,30 | +0,07 | +7% | −10% | +10% | +3% | +1% | −4% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam | 264 | +0,82 | +1,5 | %28 | −1,01 | −0,48 | +1,11 | +0,53 | −0,10 | +13% | −32% | +18% | +9% | −3% | +5% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | 343 | +0,49 | +1,6 | %24 | −0,99 | −0,53 | +0,71 | +0,28 | −0,14 | +11% | −36% | +17% | +5% | −5% | +1% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | 298 | +0,72 | +2,9 | %37 | −0,35 | +0,03 | +0,98 | +0,46 | +0,27 | +16% | −14% | +21% | +11% | +7% | +9% |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | 385 | +0,40 | +2,8 | %35 | −0,43 | −0,05 | +0,48 | +0,32 | +0,14 | +12% | −11% | +14% | +10% | +4% | +7% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | 164 | +1,87 | +1,9 | %32 | −0,94 | −0,23 | +1,98 | +1,74 | +0,69 | +21% | −22% | +23% | +19% | +8% | +3% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | 193 | +1,49 | +2,4 | %29 | −0,91 | −0,12 | +1,70 | +1,26 | +0,42 | +21% | −22% | +27% | +16% | +6% | +5% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | 191 | +1,12 | +2,9 | %43 | −0,33 | +0,19 | +1,48 | +0,76 | +0,64 | +16% | −14% | +21% | +12% | +9% | +8% |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | 202 | +0,49 | +2,6 | %39 | −0,43 | +0,05 | +0,69 | +0,28 | +0,30 | +8% | −10% | +11% | +4% | +4% | +4% |
| 4 coin · kapanış · long · süzgeçsiz · tam | 102 | +3,13 | +1,5 | %31 | −1,04 | −0,30 | +5,37 | +1,36 | −0,03 | +19% | −24% | +28% | +11% | −1% | −5% |
| 4 coin · kapanış · long · süzgeçsiz · tam−atlama | 117 | +3,06 | +1,7 | %29 | −0,97 | +0,05 | +5,63 | +1,15 | −0,06 | +22% | −30% | +36% | +10% | −1% | −5% |
| 4 coin · kapanış · long · süzgeçsiz · tam−piramit | 112 | +2,12 | +2,5 | %43 | −0,36 | +0,24 | +2,95 | +1,35 | +0,29 | +17% | −17% | +22% | +11% | +3% | −4% |
| 4 coin · kapanış · long · süzgeçsiz · D20/10 | 131 | +1,75 | +2,7 | %43 | −0,34 | +0,21 | +2,90 | +0,78 | +0,23 | +16% | −17% | +25% | +8% | +2% | −5% |
| 4 coin · kapanış · long · BTC SMA200 · tam | 68 | +5,04 | +1,6 | %34 | −0,97 | +0,16 | +8,44 | +2,36 | +0,10 | +21% | −20% | +30% | +13% | +0% | −2% |
| 4 coin · kapanış · long · BTC SMA200 · tam−atlama | 72 | +5,23 | +1,8 | %35 | −0,86 | +0,64 | +9,87 | +2,10 | +0,05 | +24% | −22% | +37% | +13% | +0% | −2% |
| 4 coin · kapanış · long · BTC SMA200 · tam−piramit | 74 | +3,29 | +2,7 | %53 | +0,22 | +1,02 | +4,34 | +2,30 | +0,53 | +17% | −17% | +21% | +13% | +3% | −2% |
| 4 coin · kapanış · long · BTC SMA200 · D20/10 | 74 | +2,85 | +2,5 | %51 | +0,07 | +0,86 | +4,87 | +1,32 | +0,15 | +15% | −17% | +21% | +8% | +1% | −7% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | 179 | +1,63 | +1,4 | %27 | −1,06 | −0,49 | +2,98 | +0,57 | +0,08 | +16% | −29% | +27% | +7% | +1% | +1% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | 216 | +1,55 | +1,6 | %26 | −1,02 | −0,35 | +2,78 | +0,50 | +0,08 | +20% | −35% | +35% | +7% | +1% | +5% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | 189 | +1,27 | +2,3 | %39 | −0,48 | −0,12 | +2,04 | +0,62 | +0,15 | +16% | −18% | +25% | +9% | +2% | −0% |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | 224 | +0,89 | +2,3 | %40 | −0,48 | −0,06 | +1,44 | +0,39 | +0,12 | +14% | −18% | +22% | +7% | +2% | +0% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | 114 | +2,94 | +1,6 | %29 | −0,92 | −0,22 | +4,96 | +1,30 | +0,20 | +21% | −26% | +30% | +12% | +2% | +6% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | 130 | +2,89 | +1,8 | %29 | −0,89 | −0,00 | +4,93 | +1,19 | +0,30 | +24% | −30% | +38% | +12% | +3% | +9% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | 123 | +2,00 | +2,6 | %48 | −0,05 | +0,18 | +2,79 | +1,29 | +0,46 | +17% | −17% | +22% | +12% | +5% | +3% |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | 134 | +1,57 | +2,5 | %44 | −0,50 | +0,12 | +2,50 | +0,72 | +0,23 | +15% | −17% | +22% | +8% | +2% | −1% |
| ilk 50 · gün içi · long · süzgeçsiz · tam | 528 | +0,27 | +0,7 | %16 | −1,01 | −0,92 | +0,09 | +0,41 | +0,22 | +4% | −57% | +0% | +7% | +6% | −8% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−atlama | 569 | +0,00 | +0,0 | %14 | −1,01 | −0,98 | −0,27 | +0,24 | −0,19 | −6% | −64% | −12% | −0% | −12% | −33% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−piramit | 593 | +0,42 | +2,1 | %25 | −0,82 | −0,37 | +0,52 | +0,32 | +0,31 | +16% | −32% | +19% | +13% | +13% | +0% |
| ilk 50 · gün içi · long · süzgeçsiz · D20/10 | 627 | +0,23 | +1,8 | %28 | −0,68 | −0,30 | +0,30 | +0,17 | +0,10 | +10% | −28% | +13% | +7% | +4% | −7% |
| ilk 50 · gün içi · long · BTC SMA200 · tam | 312 | +0,47 | +1,1 | %17 | −1,01 | −0,77 | +0,46 | +0,49 | +0,68 | +8% | −46% | +10% | +7% | +12% | −6% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−atlama | 325 | +0,41 | +1,1 | %17 | −1,01 | −0,77 | +0,23 | +0,60 | +0,58 | +7% | −41% | +5% | +10% | +11% | −6% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−piramit | 385 | +0,43 | +1,7 | %24 | −0,97 | −0,42 | +0,80 | +0,13 | +0,37 | +10% | −36% | +19% | +2% | +9% | −4% |
| ilk 50 · gün içi · long · BTC SMA200 · D20/10 | 395 | +0,36 | +1,9 | %29 | −0,72 | −0,28 | +0,60 | +0,17 | +0,36 | +10% | −26% | +16% | +4% | +9% | −1% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | 851 | +0,17 | +0,7 | %23 | −0,98 | −0,66 | +0,04 | +0,27 | +0,21 | +4% | −60% | −0% | +8% | +11% | +5% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | 923 | −0,02 | −0,1 | %22 | −0,94 | −0,71 | −0,21 | +0,15 | −0,06 | −8% | −62% | −15% | +1% | −8% | −28% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | 1026 | +0,24 | +2,1 | %31 | −0,53 | −0,30 | +0,32 | +0,18 | +0,22 | +17% | −34% | +21% | +13% | +16% | +11% |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | 1134 | +0,13 | +1,7 | %33 | −0,45 | −0,24 | +0,17 | +0,09 | +0,09 | +10% | −21% | +13% | +7% | +7% | −1% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | 477 | +0,27 | +1,0 | %21 | −0,98 | −0,64 | +0,34 | +0,20 | +0,42 | +7% | −52% | +10% | +3% | +12% | −2% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | 500 | +0,22 | +0,8 | %22 | −0,96 | −0,65 | +0,20 | +0,23 | +0,30 | +5% | −49% | +6% | +4% | +9% | −6% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | 586 | +0,26 | +1,5 | %28 | −0,72 | −0,38 | +0,56 | +0,02 | +0,23 | +9% | −43% | +21% | −2% | +9% | −2% |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | 609 | +0,25 | +2,0 | %33 | −0,45 | −0,24 | +0,50 | +0,07 | +0,21 | +11% | −28% | +20% | +2% | +9% | +1% |
| ilk 50 · kapanış · long · süzgeçsiz · tam | 305 | +0,16 | +0,5 | %22 | −1,09 | −0,85 | +0,19 | +0,13 | +0,02 | +2% | −48% | +2% | +2% | −2% | −22% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−atlama | 319 | +0,31 | +0,7 | %20 | −1,09 | −0,88 | +0,73 | −0,00 | −0,23 | +4% | −59% | +11% | −3% | −9% | −27% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−piramit | 360 | +0,72 | +2,4 | %30 | −0,90 | −0,35 | +0,72 | +0,72 | +0,52 | +17% | −36% | +15% | +20% | +15% | +3% |
| ilk 50 · kapanış · long · süzgeçsiz · D20/10 | 396 | +0,69 | +2,4 | %31 | −0,79 | −0,33 | +1,03 | +0,39 | +0,21 | +18% | −29% | +26% | +11% | +6% | −8% |
| ilk 50 · kapanış · long · BTC SMA200 · tam | 180 | +0,80 | +1,7 | %27 | −1,04 | −0,40 | +0,63 | +0,92 | +1,46 | +10% | −27% | +7% | +13% | +19% | −8% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−atlama | 183 | +1,17 | +1,6 | %24 | −1,07 | −0,58 | +1,77 | +0,78 | +1,37 | +14% | −38% | +18% | +10% | +19% | −8% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−piramit | 214 | +0,94 | +2,2 | %30 | −0,90 | −0,27 | +1,25 | +0,69 | +0,58 | +13% | −36% | +16% | +11% | +10% | −6% |
| ilk 50 · kapanış · long · BTC SMA200 · D20/10 | 245 | +0,94 | +2,3 | %31 | −0,89 | −0,28 | +1,71 | +0,34 | +0,54 | +15% | −24% | +25% | +6% | +10% | −6% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | 500 | +0,45 | +1,5 | %31 | −0,86 | −0,54 | +0,79 | +0,16 | +0,12 | +14% | −46% | +23% | +6% | +3% | −15% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | 558 | +0,20 | +1,0 | %31 | −0,82 | −0,57 | +0,39 | +0,04 | −0,07 | +7% | −45% | +14% | +0% | −6% | −22% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | 634 | +0,47 | +2,7 | %37 | −0,46 | −0,26 | +0,46 | +0,47 | +0,40 | +21% | −28% | +18% | +24% | +21% | +11% |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | 705 | +0,46 | +2,8 | %40 | −0,40 | −0,25 | +0,66 | +0,29 | +0,25 | +23% | −18% | +30% | +17% | +15% | +5% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | 299 | +0,45 | +1,5 | %31 | −0,90 | −0,44 | +0,55 | +0,37 | +0,82 | +9% | −30% | +11% | +7% | +17% | −5% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | 308 | +0,64 | +1,4 | %29 | −0,84 | −0,55 | +1,19 | +0,25 | +0,74 | +12% | −40% | +22% | +4% | +16% | −7% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | 357 | +0,61 | +2,3 | %36 | −0,49 | −0,26 | +0,90 | +0,38 | +0,33 | +14% | −37% | +19% | +9% | +9% | −3% |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | 399 | +0,60 | +2,4 | %37 | −0,47 | −0,26 | +1,22 | +0,12 | +0,26 | +16% | −27% | +30% | +3% | +8% | −6% |

## Long ve short bacağı (long+short kurulumlarında)

| Kurulum | Long işlem | Long R | Short işlem | Short R |
|---|---|---|---|---|
| 4 coin · gün içi · long+short · süzgeçsiz · tam | 142 | +1,73 | 122 | −0,24 |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | 181 | +1,16 | 162 | −0,25 |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | 158 | +1,38 | 140 | −0,03 |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | 198 | +0,86 | 187 | −0,09 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | 96 | +3,26 | 68 | −0,11 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | 116 | +2,44 | 77 | +0,06 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | 113 | +1,84 | 78 | +0,07 |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | 122 | +0,71 | 80 | +0,17 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | 99 | +3,22 | 80 | −0,34 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | 111 | +3,28 | 105 | −0,29 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | 106 | +2,41 | 83 | −0,17 |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | 121 | +1,77 | 103 | −0,14 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | 67 | +5,10 | 47 | −0,14 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | 71 | +5,29 | 59 | −0,00 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | 73 | +3,33 | 50 | +0,04 |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | 74 | +2,85 | 60 | −0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | 528 | +0,27 | 323 | −0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | 569 | +0,01 | 354 | −0,07 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | 593 | +0,42 | 433 | +0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | 627 | +0,23 | 507 | −0,00 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | 312 | +0,47 | 165 | −0,12 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | 325 | +0,41 | 175 | −0,15 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | 385 | +0,43 | 201 | −0,06 |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | 395 | +0,36 | 214 | +0,05 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | 292 | +0,65 | 208 | +0,18 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | 327 | +0,28 | 231 | +0,09 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | 362 | +0,70 | 272 | +0,15 |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | 390 | +0,75 | 315 | +0,11 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | 180 | +0,80 | 119 | −0,08 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | 181 | +1,20 | 127 | −0,16 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | 214 | +1,01 | 143 | +0,02 |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | 245 | +0,94 | 154 | +0,05 |

## Yıl yıl portföy getirisi

| Kurulum | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|
| 4 coin · gün içi · long · süzgeçsiz · tam | +35% | +29% | −5% | +53% | +3% | −2% | +1% |
| 4 coin · gün içi · long · süzgeçsiz · tam−atlama | +35% | +30% | −5% | +49% | +9% | −11% | −0% |
| 4 coin · gün içi · long · süzgeçsiz · tam−piramit | +16% | +62% | −3% | +28% | +3% | +4% | +5% |
| 4 coin · gün içi · long · süzgeçsiz · D20/10 | +13% | +39% | −3% | +31% | +3% | +2% | +5% |
| 4 coin · gün içi · long · BTC SMA200 · tam | +42% | +41% | +0% | +65% | +8% | −3% | +3% |
| 4 coin · gün içi · long · BTC SMA200 · tam−atlama | +43% | +43% | +0% | +66% | +5% | −8% | +4% |
| 4 coin · gün içi · long · BTC SMA200 · tam−piramit | +18% | +59% | +0% | +20% | +3% | +4% | +5% |
| 4 coin · gün içi · long · BTC SMA200 · D20/10 | +12% | +26% | +0% | +2% | +2% | +2% | +0% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam | +29% | +25% | −1% | +50% | −6% | −12% | +12% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | +28% | +20% | +7% | +36% | −1% | −23% | +12% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | +15% | +57% | +1% | +28% | −3% | −0% | +14% |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | +11% | +31% | +4% | +25% | −1% | −4% | +13% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | +42% | +34% | +5% | +57% | +2% | −7% | +14% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | +43% | +34% | +13% | +56% | −2% | −12% | +16% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | +18% | +54% | +4% | +18% | −0% | +3% | +13% |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | +12% | +22% | +6% | −1% | −0% | +2% | +8% |
| 4 coin · kapanış · long · süzgeçsiz · tam | +61% | +48% | −11% | +51% | −3% | −5% | +2% |
| 4 coin · kapanış · long · süzgeçsiz · tam−atlama | +61% | +71% | −9% | +55% | −3% | −6% | +3% |
| 4 coin · kapanış · long · süzgeçsiz · tam−piramit | +18% | +68% | −7% | +21% | +18% | +0% | +1% |
| 4 coin · kapanış · long · süzgeçsiz · D20/10 | +19% | +78% | −7% | +23% | +8% | −0% | +1% |
| 4 coin · kapanış · long · BTC SMA200 · tam | +64% | +53% | +0% | +37% | −0% | −6% | +6% |
| 4 coin · kapanış · long · BTC SMA200 · tam−atlama | +64% | +76% | +0% | +40% | +0% | −7% | +6% |
| 4 coin · kapanış · long · BTC SMA200 · tam−piramit | +18% | +66% | −0% | +14% | +20% | −0% | +3% |
| 4 coin · kapanış · long · BTC SMA200 · D20/10 | +17% | +63% | +0% | +17% | +10% | −1% | −2% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | +59% | +44% | −9% | +40% | −10% | −6% | +7% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | +58% | +61% | −3% | +45% | −11% | −10% | +12% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | +18% | +77% | −1% | +12% | +14% | −3% | +3% |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | +18% | +62% | −2% | +17% | +5% | −4% | +5% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | +64% | +49% | +2% | +34% | −4% | −10% | +13% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | +64% | +68% | +9% | +33% | −5% | −10% | +17% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | +18% | +63% | +5% | +11% | +17% | −2% | +7% |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | +17% | +57% | +7% | +13% | +7% | −3% | +3% |
| ilk 50 · gün içi · long · süzgeçsiz · tam | +36% | −6% | −27% | +82% | −36% | +8% | +7% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−atlama | +24% | −20% | −32% | +63% | −27% | +3% | −22% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−piramit | +18% | +62% | −17% | +70% | −17% | +12% | +4% |
| ilk 50 · gün içi · long · süzgeçsiz · D20/10 | +11% | +45% | −15% | +37% | −8% | +1% | +3% |
| ilk 50 · gün içi · long · BTC SMA200 · tam | +54% | −15% | −1% | +62% | −33% | +12% | +4% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−atlama | +40% | −16% | −2% | +58% | −24% | +10% | +4% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−piramit | +28% | +44% | −1% | +19% | −22% | +5% | +4% |
| ilk 50 · gün içi · long · BTC SMA200 · D20/10 | +18% | +41% | −0% | +8% | −8% | +5% | +5% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | +29% | −13% | −17% | +70% | −39% | +18% | +12% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | +10% | −30% | −21% | +51% | −26% | +11% | −21% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | +12% | +53% | −4% | +65% | −21% | +19% | +7% |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | +4% | +31% | +1% | +32% | −10% | +8% | +3% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | +54% | −21% | +11% | +55% | −39% | +9% | +8% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | +40% | −21% | +12% | +49% | −32% | +6% | +4% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | +28% | +34% | +14% | +14% | −29% | +3% | +7% |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | +18% | +38% | +17% | +5% | −14% | +5% | +6% |
| ilk 50 · kapanış · long · süzgeçsiz · tam | +45% | −1% | −24% | +12% | −2% | +3% | −8% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−atlama | +77% | −0% | −26% | +27% | −10% | −2% | −14% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−piramit | +33% | +33% | −17% | +44% | +6% | +13% | +8% |
| ilk 50 · kapanış · long · süzgeçsiz · D20/10 | +38% | +77% | −20% | +52% | −11% | +3% | +5% |
| ilk 50 · kapanış · long · BTC SMA200 · tam | +23% | +2% | −2% | +24% | +12% | +3% | +2% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−atlama | +51% | +6% | −3% | +31% | +7% | +3% | +2% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−piramit | +36% | +19% | −2% | +21% | +5% | +5% | +2% |
| ilk 50 · kapanış · long · BTC SMA200 · D20/10 | +39% | +61% | −2% | +14% | −9% | +6% | +2% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | +79% | +18% | −7% | +9% | +3% | +9% | −4% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | +41% | +13% | −11% | +25% | −7% | +3% | −11% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | +28% | +26% | +0% | +44% | +8% | +24% | +9% |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | +36% | +66% | −4% | +51% | −9% | +13% | +12% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | +23% | −2% | +18% | +17% | −0% | −1% | +6% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | +51% | +2% | +15% | +21% | −5% | +1% | +3% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | +36% | +12% | +18% | +24% | −2% | +1% | +5% |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | +39% | +55% | +17% | +10% | −14% | +5% | +1% |

## Geçenler (≥100 işlem; R ve portföy getirisi iki yarıda ve son 24 ayda artı)

- 4 coin · gün içi · long · süzgeçsiz · tam−piramit: 158 işlem, +1,38R, yıllık +16%, düşüş −14%, son 24 ay yıllık +6%
- 4 coin · gün içi · long · süzgeçsiz · D20/10: 198 işlem, +0,86R, yıllık +13%, düşüş −10%, son 24 ay yıllık +4%
- 4 coin · gün içi · long · BTC SMA200 · tam−atlama: 116 işlem, +2,44R, yıllık +21%, düşüş −20%, son 24 ay yıllık +2%
- 4 coin · gün içi · long · BTC SMA200 · tam−piramit: 113 işlem, +1,84R, yıllık +16%, düşüş −14%, son 24 ay yıllık +5%
- 4 coin · gün içi · long · BTC SMA200 · D20/10: 122 işlem, +0,71R, yıllık +7%, düşüş −10%, son 24 ay yıllık +1%
- 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit: 298 işlem, +0,72R, yıllık +16%, düşüş −14%, son 24 ay yıllık +7%
- 4 coin · gün içi · long+short · süzgeçsiz · D20/10: 385 işlem, +0,40R, yıllık +12%, düşüş −11%, son 24 ay yıllık +4%
- 4 coin · gün içi · long+short · BTC SMA200 · tam: 164 işlem, +1,87R, yıllık +21%, düşüş −22%, son 24 ay yıllık +8%
- 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama: 193 işlem, +1,49R, yıllık +21%, düşüş −22%, son 24 ay yıllık +6%
- 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit: 191 işlem, +1,12R, yıllık +16%, düşüş −14%, son 24 ay yıllık +9%
- 4 coin · gün içi · long+short · BTC SMA200 · D20/10: 202 işlem, +0,49R, yıllık +8%, düşüş −10%, son 24 ay yıllık +4%
- 4 coin · kapanış · long · süzgeçsiz · tam−piramit: 112 işlem, +2,12R, yıllık +17%, düşüş −17%, son 24 ay yıllık +3%
- 4 coin · kapanış · long · süzgeçsiz · D20/10: 131 işlem, +1,75R, yıllık +16%, düşüş −17%, son 24 ay yıllık +2%
- 4 coin · kapanış · long+short · süzgeçsiz · tam: 179 işlem, +1,63R, yıllık +16%, düşüş −29%, son 24 ay yıllık +1%
- 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama: 216 işlem, +1,55R, yıllık +20%, düşüş −35%, son 24 ay yıllık +1%
- 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit: 189 işlem, +1,27R, yıllık +16%, düşüş −18%, son 24 ay yıllık +2%
- 4 coin · kapanış · long+short · süzgeçsiz · D20/10: 224 işlem, +0,89R, yıllık +14%, düşüş −18%, son 24 ay yıllık +2%
- 4 coin · kapanış · long+short · BTC SMA200 · tam: 114 işlem, +2,94R, yıllık +21%, düşüş −26%, son 24 ay yıllık +2%
- 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama: 130 işlem, +2,89R, yıllık +24%, düşüş −30%, son 24 ay yıllık +3%
- 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit: 123 işlem, +2,00R, yıllık +17%, düşüş −17%, son 24 ay yıllık +5%
- 4 coin · kapanış · long+short · BTC SMA200 · D20/10: 134 işlem, +1,57R, yıllık +15%, düşüş −17%, son 24 ay yıllık +2%
- ilk 50 · gün içi · long · süzgeçsiz · tam: 528 işlem, +0,27R, yıllık +4%, düşüş −57%, son 24 ay yıllık +6%
- ilk 50 · gün içi · long · süzgeçsiz · tam−piramit: 593 işlem, +0,42R, yıllık +16%, düşüş −32%, son 24 ay yıllık +13%
- ilk 50 · gün içi · long · süzgeçsiz · D20/10: 627 işlem, +0,23R, yıllık +10%, düşüş −28%, son 24 ay yıllık +4%
- ilk 50 · gün içi · long · BTC SMA200 · tam: 312 işlem, +0,47R, yıllık +8%, düşüş −46%, son 24 ay yıllık +12%
- ilk 50 · gün içi · long · BTC SMA200 · tam−atlama: 325 işlem, +0,41R, yıllık +7%, düşüş −41%, son 24 ay yıllık +11%
- ilk 50 · gün içi · long · BTC SMA200 · tam−piramit: 385 işlem, +0,43R, yıllık +10%, düşüş −36%, son 24 ay yıllık +9%
- ilk 50 · gün içi · long · BTC SMA200 · D20/10: 395 işlem, +0,36R, yıllık +10%, düşüş −26%, son 24 ay yıllık +9%
- ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit: 1026 işlem, +0,24R, yıllık +17%, düşüş −34%, son 24 ay yıllık +16%
- ilk 50 · gün içi · long+short · süzgeçsiz · D20/10: 1134 işlem, +0,13R, yıllık +10%, düşüş −21%, son 24 ay yıllık +7%
- ilk 50 · gün içi · long+short · BTC SMA200 · tam: 477 işlem, +0,27R, yıllık +7%, düşüş −52%, son 24 ay yıllık +12%
- ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama: 500 işlem, +0,22R, yıllık +5%, düşüş −49%, son 24 ay yıllık +9%
- ilk 50 · gün içi · long+short · BTC SMA200 · D20/10: 609 işlem, +0,25R, yıllık +11%, düşüş −28%, son 24 ay yıllık +9%
- ilk 50 · kapanış · long · süzgeçsiz · tam−piramit: 360 işlem, +0,72R, yıllık +17%, düşüş −36%, son 24 ay yıllık +15%
- ilk 50 · kapanış · long · süzgeçsiz · D20/10: 396 işlem, +0,69R, yıllık +18%, düşüş −29%, son 24 ay yıllık +6%
- ilk 50 · kapanış · long · BTC SMA200 · tam: 180 işlem, +0,80R, yıllık +10%, düşüş −27%, son 24 ay yıllık +19%
- ilk 50 · kapanış · long · BTC SMA200 · tam−atlama: 183 işlem, +1,17R, yıllık +14%, düşüş −38%, son 24 ay yıllık +19%
- ilk 50 · kapanış · long · BTC SMA200 · tam−piramit: 214 işlem, +0,94R, yıllık +13%, düşüş −36%, son 24 ay yıllık +10%
- ilk 50 · kapanış · long · BTC SMA200 · D20/10: 245 işlem, +0,94R, yıllık +15%, düşüş −24%, son 24 ay yıllık +10%
- ilk 50 · kapanış · long+short · süzgeçsiz · tam: 500 işlem, +0,45R, yıllık +14%, düşüş −46%, son 24 ay yıllık +3%
- ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit: 634 işlem, +0,47R, yıllık +21%, düşüş −28%, son 24 ay yıllık +21%
- ilk 50 · kapanış · long+short · süzgeçsiz · D20/10: 705 işlem, +0,46R, yıllık +23%, düşüş −18%, son 24 ay yıllık +15%
- ilk 50 · kapanış · long+short · BTC SMA200 · tam: 299 işlem, +0,45R, yıllık +9%, düşüş −30%, son 24 ay yıllık +17%
- ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama: 308 işlem, +0,64R, yıllık +12%, düşüş −40%, son 24 ay yıllık +16%
- ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit: 357 işlem, +0,61R, yıllık +14%, düşüş −37%, son 24 ay yıllık +9%
- ilk 50 · kapanış · long+short · BTC SMA200 · D20/10: 399 işlem, +0,60R, yıllık +16%, düşüş −27%, son 24 ay yıllık +8%
