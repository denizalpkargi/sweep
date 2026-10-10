# Test #1 · Tam Kaplumbağa sistemi

Arşiv günlük mumları, 2020-06 → 2026-10. Birim = özsermayenin %1'i ÷ N, stop 2N (birim başına %2 risk), coin başına 4, aynı yönde toplam 6 birim, nominal ≤ 4x. Maliyet taraf başına %0,08 + arşiv fonlaması. R = işlem sonucu ÷ ilk birimin riski. "1. yarı / 2. yarı / son 24 ay" sütunları portföyün yıllık getirisi; R sütunları işlem ortalaması. Kural: `node tests/test01-tam-turtle.js`.

| Kurulum | İşlem | Ort. R | t | Kazanma | Medyan R | En iyi %5 hariç | R 1. yarı | R 2. yarı | R son 24 ay | Yıllık | Düşüş | Yıllık 1. yarı | Yıllık 2. yarı | Yıllık son 24 ay | Son 12 ay |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 coin · gün içi · long · süzgeçsiz · tam | 142 | +1,69 | +1,7 | %30 | −1,02 | −0,31 | +2,24 | +1,19 | −0,15 | +40% | −57% | +55% | +26% | −13% | −25% |
| 4 coin · gün içi · long · süzgeçsiz · tam−atlama | 181 | +1,11 | +2,1 | %27 | −1,01 | −0,32 | +1,44 | +0,80 | −0,18 | +40% | −69% | +70% | +15% | −18% | −34% |
| 4 coin · gün içi · long · süzgeçsiz · tam−piramit | 158 | +1,38 | +3,0 | %44 | −0,21 | +0,32 | +1,91 | +0,89 | +0,43 | +61% | −27% | +80% | +44% | +21% | −3% |
| 4 coin · gün içi · long · süzgeçsiz · D20/10 | 198 | +0,86 | +3,3 | %41 | −0,29 | +0,23 | +1,09 | +0,67 | +0,26 | +51% | −29% | +65% | +39% | +15% | −7% |
| 4 coin · gün içi · long · BTC SMA200 · tam | 96 | +3,25 | +2,0 | %38 | −0,82 | +0,26 | +3,45 | +3,04 | +0,57 | +70% | −42% | +72% | +68% | +13% | −17% |
| 4 coin · gün içi · long · BTC SMA200 · tam−atlama | 116 | +2,41 | +2,4 | %34 | −0,98 | +0,43 | +2,56 | +2,24 | +0,23 | +74% | −46% | +98% | +53% | +3% | −14% |
| 4 coin · gün içi · long · BTC SMA200 · tam−piramit | 113 | +1,84 | +2,9 | %50 | +0,03 | +0,48 | +2,53 | +1,20 | +0,65 | +59% | −30% | +77% | +43% | +22% | −3% |
| 4 coin · gün içi · long · BTC SMA200 · D20/10 | 122 | +0,71 | +2,4 | %41 | −0,42 | +0,13 | +1,16 | +0,30 | +0,07 | +24% | −26% | +40% | +10% | +1% | −16% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam | 264 | +0,79 | +1,4 | %28 | −1,01 | −0,48 | +1,11 | +0,48 | −0,13 | +25% | −79% | +44% | +8% | −20% | +8% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | 343 | +0,47 | +1,6 | %24 | −0,99 | −0,53 | +0,69 | +0,25 | −0,15 | +17% | −84% | +52% | −9% | −28% | −6% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | 298 | +0,72 | +2,9 | %37 | −0,35 | +0,03 | +0,98 | +0,46 | +0,27 | +57% | −35% | +75% | +41% | +23% | +33% |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | 385 | +0,40 | +2,8 | %35 | −0,43 | −0,05 | +0,48 | +0,32 | +0,14 | +41% | −40% | +52% | +31% | +12% | +22% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | 164 | +1,86 | +1,9 | %32 | −0,95 | −0,23 | +1,98 | +1,72 | +0,64 | +62% | −52% | +67% | +57% | +25% | +6% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | 193 | +1,47 | +2,4 | %29 | −0,91 | −0,13 | +1,67 | +1,25 | +0,39 | +70% | −64% | +107% | +40% | +13% | +14% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | 191 | +1,12 | +2,9 | %43 | −0,33 | +0,19 | +1,48 | +0,76 | +0,64 | +60% | −29% | +77% | +45% | +38% | +31% |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | 202 | +0,49 | +2,6 | %39 | −0,43 | +0,05 | +0,69 | +0,28 | +0,30 | +28% | −34% | +43% | +15% | +16% | +14% |
| 4 coin · kapanış · long · süzgeçsiz · tam | 102 | +3,16 | +1,5 | %30 | −1,03 | −0,38 | +5,60 | +1,23 | −0,12 | +44% | −65% | +66% | +25% | −10% | −29% |
| 4 coin · kapanış · long · süzgeçsiz · tam−atlama | 117 | +3,09 | +1,7 | %28 | −0,97 | −0,02 | +5,80 | +1,06 | −0,07 | +59% | −74% | +108% | +22% | −10% | −26% |
| 4 coin · kapanış · long · süzgeçsiz · tam−piramit | 112 | +2,12 | +2,5 | %43 | −0,36 | +0,24 | +2,95 | +1,35 | +0,29 | +53% | −39% | +69% | +39% | +9% | −17% |
| 4 coin · kapanış · long · süzgeçsiz · D20/10 | 131 | +1,75 | +2,7 | %43 | −0,34 | +0,21 | +2,90 | +0,78 | +0,23 | +54% | −38% | +84% | +30% | +8% | −19% |
| 4 coin · kapanış · long · BTC SMA200 · tam | 68 | +5,12 | +1,6 | %32 | −0,97 | +0,10 | +8,76 | +2,26 | +0,09 | +59% | −52% | +80% | +40% | −1% | −9% |
| 4 coin · kapanış · long · BTC SMA200 · tam−atlama | 72 | +5,26 | +1,8 | %33 | −0,89 | +0,54 | +10,14 | +1,98 | +0,05 | +72% | −60% | +117% | +36% | −3% | −9% |
| 4 coin · kapanış · long · BTC SMA200 · tam−piramit | 74 | +3,29 | +2,7 | %53 | +0,22 | +1,02 | +4,34 | +2,30 | +0,53 | +57% | −41% | +68% | +47% | +13% | −8% |
| 4 coin · kapanış · long · BTC SMA200 · D20/10 | 74 | +2,85 | +2,5 | %51 | +0,07 | +0,86 | +4,87 | +1,32 | +0,15 | +48% | −28% | +68% | +31% | +2% | −25% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | 179 | +1,64 | +1,3 | %27 | −1,06 | −0,52 | +3,11 | +0,48 | +0,01 | +31% | −74% | +60% | +7% | −7% | −12% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | 216 | +1,56 | +1,5 | %25 | −1,02 | −0,38 | +2,87 | +0,45 | +0,07 | +45% | −82% | +97% | +6% | −5% | +9% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | 189 | +1,27 | +2,3 | %39 | −0,48 | −0,12 | +2,04 | +0,62 | +0,15 | +50% | −46% | +78% | +26% | +7% | −4% |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | 224 | +0,89 | +2,3 | %40 | −0,48 | −0,06 | +1,44 | +0,39 | +0,12 | +45% | −42% | +72% | +22% | +5% | −2% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | 114 | +2,98 | +1,6 | %28 | −0,92 | −0,27 | +5,15 | +1,23 | +0,19 | +53% | −68% | +78% | +31% | +1% | +18% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | 130 | +2,91 | +1,7 | %28 | −0,89 | −0,04 | +5,07 | +1,11 | +0,30 | +67% | −75% | +117% | +29% | +6% | +30% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | 123 | +2,00 | +2,6 | %48 | −0,05 | +0,18 | +2,79 | +1,29 | +0,46 | +57% | −36% | +73% | +43% | +19% | +11% |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | 134 | +1,57 | +2,5 | %44 | −0,50 | +0,12 | +2,50 | +0,72 | +0,23 | +47% | −34% | +71% | +26% | +7% | −7% |
| ilk 50 · gün içi · long · süzgeçsiz · tam | 528 | +0,30 | +0,7 | %15 | −1,01 | −0,92 | +0,07 | +0,49 | +0,21 | −28% | −98% | −28% | −28% | −11% | −44% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−atlama | 569 | +0,03 | +0,1 | %14 | −1,01 | −0,97 | −0,28 | +0,31 | −0,21 | −49% | −100% | −55% | −43% | −55% | −83% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−piramit | 593 | +0,42 | +2,1 | %25 | −0,82 | −0,37 | +0,52 | +0,32 | +0,31 | +32% | −79% | +41% | +23% | +36% | −1% |
| ilk 50 · gün içi · long · süzgeçsiz · D20/10 | 627 | +0,23 | +1,8 | %28 | −0,68 | −0,30 | +0,30 | +0,17 | +0,10 | +20% | −72% | +35% | +6% | −2% | −30% |
| ilk 50 · gün içi · long · BTC SMA200 · tam | 312 | +0,46 | +1,1 | %17 | −1,01 | −0,77 | +0,44 | +0,48 | +0,64 | +4% | −93% | +11% | −4% | +34% | −24% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−atlama | 325 | +0,39 | +1,0 | %17 | −1,01 | −0,77 | +0,20 | +0,58 | +0,54 | +2% | −91% | −5% | +9% | +25% | −26% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−piramit | 385 | +0,43 | +1,7 | %24 | −0,97 | −0,42 | +0,80 | +0,13 | +0,37 | +16% | −85% | +50% | −10% | +22% | −15% |
| ilk 50 · gün içi · long · BTC SMA200 · D20/10 | 395 | +0,36 | +1,9 | %29 | −0,72 | −0,28 | +0,60 | +0,17 | +0,36 | +26% | −73% | +56% | +2% | +22% | −7% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | 851 | +0,19 | +0,7 | %23 | −0,96 | −0,65 | +0,03 | +0,32 | +0,21 | −26% | −98% | −29% | −23% | +10% | −4% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | 923 | −0,00 | −0,0 | %22 | −0,93 | −0,71 | −0,21 | +0,19 | −0,07 | −51% | −100% | −62% | −38% | −43% | −76% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | 1026 | +0,24 | +2,1 | %31 | −0,53 | −0,30 | +0,32 | +0,18 | +0,22 | +40% | −83% | +55% | +27% | +59% | +52% |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | 1134 | +0,13 | +1,7 | %33 | −0,45 | −0,24 | +0,17 | +0,09 | +0,09 | +23% | −63% | +37% | +10% | +13% | −8% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | 477 | +0,26 | +1,0 | %21 | −0,98 | −0,64 | +0,33 | +0,20 | +0,39 | −4% | −96% | +12% | −18% | +31% | −13% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | 500 | +0,20 | +0,8 | %21 | −0,96 | −0,65 | +0,18 | +0,22 | +0,28 | −8% | −95% | −1% | −14% | +13% | −26% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | 586 | +0,26 | +1,5 | %28 | −0,72 | −0,38 | +0,56 | +0,02 | +0,23 | +10% | −91% | +55% | −23% | +19% | −7% |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | 609 | +0,25 | +2,0 | %33 | −0,45 | −0,24 | +0,50 | +0,07 | +0,21 | +28% | −76% | +78% | −8% | +19% | −0% |
| ilk 50 · kapanış · long · süzgeçsiz · tam | 305 | +0,11 | +0,4 | %21 | −1,10 | −0,89 | +0,16 | +0,06 | −0,04 | −14% | −97% | −14% | −14% | −25% | −69% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−atlama | 319 | +0,25 | +0,6 | %20 | −1,10 | −0,91 | +0,69 | −0,06 | −0,27 | −14% | −98% | +2% | −28% | −45% | −76% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−piramit | 360 | +0,72 | +2,4 | %30 | −0,90 | −0,35 | +0,72 | +0,72 | +0,52 | +39% | −79% | +22% | +59% | +43% | −7% |
| ilk 50 · kapanış · long · süzgeçsiz · D20/10 | 396 | +0,69 | +2,4 | %31 | −0,79 | −0,33 | +1,03 | +0,39 | +0,21 | +41% | −74% | +66% | +20% | +6% | −35% |
| ilk 50 · kapanış · long · BTC SMA200 · tam | 180 | +0,72 | +1,5 | %27 | −1,05 | −0,47 | +0,56 | +0,84 | +1,39 | +20% | −69% | +15% | +27% | +50% | −31% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−atlama | 183 | +1,08 | +1,5 | %24 | −1,09 | −0,64 | +1,66 | +0,70 | +1,32 | +28% | −71% | +42% | +15% | +50% | −31% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−piramit | 214 | +0,94 | +2,2 | %30 | −0,90 | −0,27 | +1,25 | +0,69 | +0,58 | +30% | −75% | +33% | +26% | +27% | −25% |
| ilk 50 · kapanış · long · BTC SMA200 · D20/10 | 245 | +0,94 | +2,3 | %31 | −0,89 | −0,28 | +1,71 | +0,34 | +0,54 | +38% | −63% | +73% | +9% | +25% | −23% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | 500 | +0,43 | +1,4 | %31 | −0,86 | −0,56 | +0,79 | +0,13 | +0,08 | +26% | −86% | +52% | +4% | −6% | −56% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | 558 | +0,18 | +0,9 | %31 | −0,85 | −0,60 | +0,38 | +0,01 | −0,09 | +1% | −94% | +20% | −15% | −34% | −68% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | 634 | +0,47 | +2,7 | %37 | −0,46 | −0,26 | +0,46 | +0,47 | +0,40 | +66% | −61% | +43% | +93% | +79% | +33% |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | 705 | +0,46 | +2,8 | %40 | −0,40 | −0,25 | +0,66 | +0,29 | +0,25 | +72% | −53% | +93% | +53% | +48% | +11% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | 299 | +0,41 | +1,4 | %31 | −0,90 | −0,48 | +0,51 | +0,32 | +0,79 | +15% | −75% | +28% | +3% | +44% | −21% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | 308 | +0,59 | +1,3 | %29 | −0,90 | −0,59 | +1,13 | +0,21 | +0,72 | +19% | −80% | +59% | −11% | +38% | −29% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | 357 | +0,61 | +2,3 | %36 | −0,49 | −0,26 | +0,90 | +0,38 | +0,33 | +33% | −76% | +50% | +18% | +24% | −15% |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | 399 | +0,60 | +2,4 | %37 | −0,47 | −0,26 | +1,22 | +0,12 | +0,26 | +39% | −72% | +100% | −3% | +17% | −25% |

## Long ve short bacağı (long+short kurulumlarında)

| Kurulum | Long işlem | Long R | Short işlem | Short R |
|---|---|---|---|---|
| 4 coin · gün içi · long+short · süzgeçsiz · tam | 142 | +1,68 | 122 | −0,24 |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | 181 | +1,11 | 162 | −0,25 |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | 158 | +1,38 | 140 | −0,03 |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | 198 | +0,86 | 187 | −0,09 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | 96 | +3,25 | 68 | −0,12 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | 116 | +2,40 | 77 | +0,05 |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | 113 | +1,84 | 78 | +0,07 |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | 122 | +0,71 | 80 | +0,17 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | 99 | +3,25 | 80 | −0,36 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | 111 | +3,30 | 105 | −0,29 |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | 106 | +2,41 | 83 | −0,17 |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | 121 | +1,77 | 103 | −0,14 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | 67 | +5,18 | 47 | −0,15 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | 71 | +5,32 | 59 | +0,00 |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | 73 | +3,33 | 50 | +0,04 |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | 74 | +2,85 | 60 | −0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | 528 | +0,31 | 323 | −0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | 569 | +0,04 | 354 | −0,07 |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | 593 | +0,42 | 433 | +0,01 |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | 627 | +0,23 | 507 | −0,00 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | 312 | +0,46 | 165 | −0,12 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | 325 | +0,39 | 175 | −0,15 |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | 385 | +0,43 | 201 | −0,06 |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | 395 | +0,36 | 214 | +0,05 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | 292 | +0,62 | 208 | +0,17 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | 327 | +0,24 | 231 | +0,10 |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | 362 | +0,70 | 272 | +0,15 |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | 390 | +0,75 | 315 | +0,11 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | 180 | +0,73 | 119 | −0,08 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | 181 | +1,12 | 127 | −0,16 |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | 214 | +1,01 | 143 | +0,02 |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | 245 | +0,94 | 154 | +0,05 |

## Yıl yıl portföy getirisi

| Kurulum | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|
| 4 coin · gün içi · long · süzgeçsiz · tam | +139% | +61% | −19% | +213% | −3% | −11% | −1% |
| 4 coin · gün içi · long · süzgeçsiz · tam−atlama | +174% | +104% | −22% | +185% | +19% | −40% | −5% |
| 4 coin · gün içi · long · süzgeçsiz · tam−piramit | +66% | +321% | −12% | +114% | +13% | +17% | +19% |
| 4 coin · gün içi · long · süzgeçsiz · D20/10 | +57% | +205% | −11% | +131% | +10% | +8% | +18% |
| 4 coin · gün içi · long · BTC SMA200 · tam | +191% | +111% | +0% | +241% | +50% | −14% | +9% |
| 4 coin · gün içi · long · BTC SMA200 · tam−atlama | +239% | +173% | +0% | +253% | +33% | −32% | +14% |
| 4 coin · gün içi · long · BTC SMA200 · tam−piramit | +78% | +288% | +0% | +75% | +16% | +16% | +19% |
| 4 coin · gün içi · long · BTC SMA200 · D20/10 | +52% | +116% | +0% | +5% | +5% | +9% | +0% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam | +102% | +41% | −5% | +184% | −34% | −45% | +45% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−atlama | +126% | +47% | +21% | +93% | −19% | −68% | +40% |
| 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit | +57% | +272% | +1% | +114% | −9% | −5% | +59% |
| 4 coin · gün içi · long+short · süzgeçsiz · D20/10 | +48% | +141% | +12% | +91% | −8% | −18% | +55% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam | +191% | +71% | +16% | +182% | +15% | −27% | +57% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama | +239% | +113% | +53% | +173% | +0% | −43% | +68% |
| 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit | +78% | +245% | +15% | +61% | +0% | +12% | +58% |
| 4 coin · gün içi · long+short · BTC SMA200 · D20/10 | +52% | +91% | +24% | −5% | −4% | +8% | +34% |
| 4 coin · kapanış · long · süzgeçsiz · tam | +268% | +108% | −39% | +206% | −8% | −21% | −2% |
| 4 coin · kapanış · long · süzgeçsiz · tam−atlama | +268% | +243% | −34% | +236% | −12% | −25% | +5% |
| 4 coin · kapanış · long · süzgeçsiz · tam−piramit | +75% | +286% | −26% | +87% | +60% | −0% | +0% |
| 4 coin · kapanış · long · süzgeçsiz · D20/10 | +79% | +383% | −28% | +95% | +32% | −3% | +1% |
| 4 coin · kapanış · long · BTC SMA200 · tam | +295% | +126% | +0% | +115% | +5% | −25% | +25% |
| 4 coin · kapanış · long · BTC SMA200 · tam−atlama | +295% | +271% | +0% | +135% | −0% | −27% | +25% |
| 4 coin · kapanış · long · BTC SMA200 · tam−piramit | +77% | +268% | −1% | +48% | +74% | −3% | +11% |
| 4 coin · kapanış · long · BTC SMA200 · D20/10 | +68% | +254% | +0% | +62% | +44% | −3% | −9% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam | +254% | +88% | −35% | +118% | −33% | −26% | +16% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−atlama | +249% | +171% | −18% | +150% | −41% | −38% | +46% |
| 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit | +72% | +336% | −8% | +36% | +39% | −12% | +11% |
| 4 coin · kapanış · long+short · süzgeçsiz · D20/10 | +74% | +268% | −10% | +59% | +19% | −19% | +17% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam | +295% | +106% | +7% | +94% | −12% | −38% | +59% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama | +295% | +208% | +33% | +91% | −21% | −39% | +76% |
| 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit | +77% | +242% | +20% | +32% | +57% | −8% | +30% |
| 4 coin · kapanış · long+short · BTC SMA200 · D20/10 | +68% | +199% | +27% | +45% | +27% | −13% | +11% |
| ilk 50 · gün içi · long · süzgeçsiz · tam | +121% | −43% | −75% | +205% | −88% | −1% | +4% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−atlama | +74% | −70% | −81% | +119% | −78% | −19% | −67% |
| ilk 50 · gün içi · long · süzgeçsiz · tam−piramit | +58% | +235% | −56% | +340% | −60% | +22% | +16% |
| ilk 50 · gün içi · long · süzgeçsiz · D20/10 | +46% | +198% | −50% | +155% | −35% | −19% | +7% |
| ilk 50 · gün içi · long · BTC SMA200 · tam | +270% | −63% | −5% | +217% | −79% | +24% | +15% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−atlama | +186% | −65% | −9% | +182% | −64% | +6% | +15% |
| ilk 50 · gün içi · long · BTC SMA200 · tam−piramit | +124% | +113% | −4% | +53% | −68% | −2% | +17% |
| ilk 50 · gün içi · long · BTC SMA200 · D20/10 | +86% | +173% | −2% | +19% | −37% | −1% | +19% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam | +79% | −60% | −56% | +142% | −89% | +46% | +22% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−atlama | +7% | −85% | −64% | +71% | −76% | +14% | −64% |
| ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit | +33% | +184% | −20% | +319% | −68% | +59% | +32% |
| ilk 50 · gün içi · long+short · süzgeçsiz · D20/10 | +10% | +106% | −3% | +130% | −40% | +12% | +8% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam | +270% | −73% | +43% | +178% | −86% | +8% | +32% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−atlama | +186% | −73% | +47% | +126% | −78% | −8% | +15% |
| ilk 50 · gün içi · long+short · BTC SMA200 · tam−piramit | +124% | +58% | +59% | +32% | −79% | −9% | +25% |
| ilk 50 · gün içi · long+short · BTC SMA200 · D20/10 | +86% | +146% | +77% | +8% | −53% | −5% | +22% |
| ilk 50 · kapanış · long · süzgeçsiz · tam | +220% | −25% | −70% | +25% | −20% | −14% | −37% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−atlama | +395% | −29% | −73% | +93% | −40% | −30% | −51% |
| ilk 50 · kapanış · long · süzgeçsiz · tam−piramit | +122% | +70% | −56% | +195% | +7% | +31% | +19% |
| ilk 50 · kapanış · long · süzgeçsiz · D20/10 | +159% | +359% | −62% | +242% | −40% | −11% | +11% |
| ilk 50 · kapanış · long · BTC SMA200 · tam | +92% | −13% | −7% | +94% | +11% | −11% | +9% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−atlama | +196% | −8% | −12% | +124% | −9% | −11% | +9% |
| ilk 50 · kapanış · long · BTC SMA200 · tam−piramit | +153% | +15% | −8% | +70% | +4% | +3% | +6% |
| ilk 50 · kapanış · long · BTC SMA200 · D20/10 | +173% | +223% | −9% | +34% | −36% | +3% | +7% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam | +468% | +3% | −28% | +14% | +3% | +16% | −23% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−atlama | +212% | −6% | −46% | +80% | −30% | −8% | −43% |
| ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit | +103% | +39% | −5% | +211% | +19% | +105% | +25% |
| ilk 50 · kapanış · long+short · süzgeçsiz · D20/10 | +144% | +263% | −22% | +245% | −32% | +40% | +38% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam | +92% | −29% | +82% | +55% | −31% | −25% | +22% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−atlama | +196% | −21% | +60% | +70% | −45% | −21% | +8% |
| ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit | +153% | −9% | +82% | +74% | −22% | −12% | +19% |
| ilk 50 · kapanış · long+short · BTC SMA200 · D20/10 | +173% | +172% | +80% | +20% | −48% | −2% | +1% |

## Geçenler (≥100 işlem; R ve portföy getirisi iki yarıda ve son 24 ayda artı)

- 4 coin · gün içi · long · süzgeçsiz · tam−piramit: 158 işlem, +1,38R, yıllık +61%, düşüş −27%, son 24 ay yıllık +21%
- 4 coin · gün içi · long · süzgeçsiz · D20/10: 198 işlem, +0,86R, yıllık +51%, düşüş −29%, son 24 ay yıllık +15%
- 4 coin · gün içi · long · BTC SMA200 · tam−atlama: 116 işlem, +2,41R, yıllık +74%, düşüş −46%, son 24 ay yıllık +3%
- 4 coin · gün içi · long · BTC SMA200 · tam−piramit: 113 işlem, +1,84R, yıllık +59%, düşüş −30%, son 24 ay yıllık +22%
- 4 coin · gün içi · long · BTC SMA200 · D20/10: 122 işlem, +0,71R, yıllık +24%, düşüş −26%, son 24 ay yıllık +1%
- 4 coin · gün içi · long+short · süzgeçsiz · tam−piramit: 298 işlem, +0,72R, yıllık +57%, düşüş −35%, son 24 ay yıllık +23%
- 4 coin · gün içi · long+short · süzgeçsiz · D20/10: 385 işlem, +0,40R, yıllık +41%, düşüş −40%, son 24 ay yıllık +12%
- 4 coin · gün içi · long+short · BTC SMA200 · tam: 164 işlem, +1,86R, yıllık +62%, düşüş −52%, son 24 ay yıllık +25%
- 4 coin · gün içi · long+short · BTC SMA200 · tam−atlama: 193 işlem, +1,47R, yıllık +70%, düşüş −64%, son 24 ay yıllık +13%
- 4 coin · gün içi · long+short · BTC SMA200 · tam−piramit: 191 işlem, +1,12R, yıllık +60%, düşüş −29%, son 24 ay yıllık +38%
- 4 coin · gün içi · long+short · BTC SMA200 · D20/10: 202 işlem, +0,49R, yıllık +28%, düşüş −34%, son 24 ay yıllık +16%
- 4 coin · kapanış · long · süzgeçsiz · tam−piramit: 112 işlem, +2,12R, yıllık +53%, düşüş −39%, son 24 ay yıllık +9%
- 4 coin · kapanış · long · süzgeçsiz · D20/10: 131 işlem, +1,75R, yıllık +54%, düşüş −38%, son 24 ay yıllık +8%
- 4 coin · kapanış · long+short · süzgeçsiz · tam−piramit: 189 işlem, +1,27R, yıllık +50%, düşüş −46%, son 24 ay yıllık +7%
- 4 coin · kapanış · long+short · süzgeçsiz · D20/10: 224 işlem, +0,89R, yıllık +45%, düşüş −42%, son 24 ay yıllık +5%
- 4 coin · kapanış · long+short · BTC SMA200 · tam: 114 işlem, +2,98R, yıllık +53%, düşüş −68%, son 24 ay yıllık +1%
- 4 coin · kapanış · long+short · BTC SMA200 · tam−atlama: 130 işlem, +2,91R, yıllık +67%, düşüş −75%, son 24 ay yıllık +6%
- 4 coin · kapanış · long+short · BTC SMA200 · tam−piramit: 123 işlem, +2,00R, yıllık +57%, düşüş −36%, son 24 ay yıllık +19%
- 4 coin · kapanış · long+short · BTC SMA200 · D20/10: 134 işlem, +1,57R, yıllık +47%, düşüş −34%, son 24 ay yıllık +7%
- ilk 50 · gün içi · long · süzgeçsiz · tam−piramit: 593 işlem, +0,42R, yıllık +32%, düşüş −79%, son 24 ay yıllık +36%
- ilk 50 · gün içi · long · BTC SMA200 · D20/10: 395 işlem, +0,36R, yıllık +26%, düşüş −73%, son 24 ay yıllık +22%
- ilk 50 · gün içi · long+short · süzgeçsiz · tam−piramit: 1026 işlem, +0,24R, yıllık +40%, düşüş −83%, son 24 ay yıllık +59%
- ilk 50 · gün içi · long+short · süzgeçsiz · D20/10: 1134 işlem, +0,13R, yıllık +23%, düşüş −63%, son 24 ay yıllık +13%
- ilk 50 · kapanış · long · süzgeçsiz · tam−piramit: 360 işlem, +0,72R, yıllık +39%, düşüş −79%, son 24 ay yıllık +43%
- ilk 50 · kapanış · long · süzgeçsiz · D20/10: 396 işlem, +0,69R, yıllık +41%, düşüş −74%, son 24 ay yıllık +6%
- ilk 50 · kapanış · long · BTC SMA200 · tam: 180 işlem, +0,72R, yıllık +20%, düşüş −69%, son 24 ay yıllık +50%
- ilk 50 · kapanış · long · BTC SMA200 · tam−atlama: 183 işlem, +1,08R, yıllık +28%, düşüş −71%, son 24 ay yıllık +50%
- ilk 50 · kapanış · long · BTC SMA200 · tam−piramit: 214 işlem, +0,94R, yıllık +30%, düşüş −75%, son 24 ay yıllık +27%
- ilk 50 · kapanış · long · BTC SMA200 · D20/10: 245 işlem, +0,94R, yıllık +38%, düşüş −63%, son 24 ay yıllık +25%
- ilk 50 · kapanış · long+short · süzgeçsiz · tam−piramit: 634 işlem, +0,47R, yıllık +66%, düşüş −61%, son 24 ay yıllık +79%
- ilk 50 · kapanış · long+short · süzgeçsiz · D20/10: 705 işlem, +0,46R, yıllık +72%, düşüş −53%, son 24 ay yıllık +48%
- ilk 50 · kapanış · long+short · BTC SMA200 · tam: 299 işlem, +0,41R, yıllık +15%, düşüş −75%, son 24 ay yıllık +44%
- ilk 50 · kapanış · long+short · BTC SMA200 · tam−piramit: 357 işlem, +0,61R, yıllık +33%, düşüş −76%, son 24 ay yıllık +24%
