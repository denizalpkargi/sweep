# Test #31 · Pompa dönüşü short, 24 sa

10 Ekim 2026 · `python3 tests/test31-pompa-short.py`

Kural: her gün 00:00 UTC'de ayın evreninden (önceki 30 günün hacmine göre ilk 30, ek bölümde ilk 50; delist dahil, TradFi hariç) son 24 saatte en çok yükselen 3 coini short; giriş 00:00–00:15 mumunun VWAP'ı, çıkış ertesi gün aynı mumun VWAP'ı. Maliyet taker %0,05 + kayma %0,03 her bacakta, fonlama dahil (short'un aldığı/ödediği, o anki fiyatla). Getiriler basit getiri. Stop varyantları gün içi yüksek (15 dk mumların yükseği seviyeye değince seviyeden; mum seviyenin üstünde açıldıysa açılıştan) ya da 15 dk kapanış (sonraki mumun açılışında çıkış). Bileşik bakiye pozisyon başına bakiyenin 1/10 ya da 1/20'si nominal, günlük yeniden boyutlanır. Taban: aynı gün evrendeki bütün coinlerin eşit short'u.

Parametreler (24 sa, ilk 3, 00:00) Denklem 4'ün yan bulgusundan geldi (aynı arşiv, `e_mup24`); bu test onu stop, boyut ve maliyetle sınar, yeni parametre seçmez.

## Evren: ayın ilk 30 coini · 2020-06-02 → 2026-10-07 · 2319 gün, 6957 işlem



### İşlem başı getiri (nominal üzerinden, maliyet + fonlama dahil)

| stop | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay | kazanma | stop olan |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | -0,200 % | -0,235 % | -0,166 % | -0,126 % | +0,207 % | %54,3 | — |
| +%15 gün içi yüksek | -0,104 % | -0,200 % | -0,007 % | +0,172 % | +0,337 % | %53,4 | %10,1 |
| +%25 gün içi yüksek | -0,155 % | -0,251 % | -0,058 % | +0,162 % | +0,324 % | %54,0 | %3,8 |
| +%15 15 dk kapanış | -0,116 % | -0,236 % | +0,003 % | +0,224 % | +0,359 % | %53,6 | %8,3 |
| +%25 15 dk kapanış | -0,125 % | -0,230 % | -0,019 % | +0,153 % | +0,299 % | %54,1 | %2,9 |

Fonlamanın işlem başı payı: -0,060 % (short lehine artı). Seçilen coinlerin 24 sa yükselişi medyan +6,9 %.


### Taban: aynı gün evrendeki bütün coinleri short (stopsuz, aynı maliyet) ve fark

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| pompa ilk 3, gün ort. | -0,200 % | -0,235 % | -0,166 % | -0,126 % | +0,207 % |
| piyasa short, gün ort. | -0,232 % | -0,273 % | -0,191 % | -0,124 % | -0,011 % |
| fark | +0,032 % (t 0,3) | +0,039 % (t 0,3) | +0,024 % (t 0,1) | -0,002 % (t -0,0) | +0,218 % (t 0,5) |

### Bileşik bakiye (pozisyon başına 1/10 ve 1/20 nominal)

| stop | boy | son bakiye (1 → ) | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | 1/10 | 0,14 | -26 % | -91 % | -28,8 % | -64 % | -60 % | +8 % |
| stopsuz | 1/20 | 0,43 | -12 % | -66 % | -14,4 % | -37 % | -31 % | +8 % |
| +%15 gün içi yüksek | 1/10 | 0,35 | -15 % | -77 % | -4,6 % | -58 % | -18 % | +34 % |
| +%15 gün içi yüksek | 1/20 | 0,64 | -7 % | -48 % | -2,3 % | -32 % | -5 % | +18 % |
| +%25 gün içi yüksek | 1/10 | 0,23 | -21 % | -86 % | -7,7 % | -66 % | -33 % | +30 % |
| +%25 gün içi yüksek | 1/20 | 0,53 | -10 % | -58 % | -3,8 % | -38 % | -14 % | +17 % |
| +%15 15 dk kapanış | 1/10 | 0,31 | -17 % | -80 % | -7,8 % | -63 % | -16 % | +37 % |
| +%15 15 dk kapanış | 1/20 | 0,61 | -7 % | -52 % | -3,9 % | -37 % | -4 % | +19 % |
| +%25 15 dk kapanış | 1/10 | 0,28 | -18 % | -82 % | -9,5 % | -63 % | -24 % | +26 % |
| +%25 15 dk kapanış | 1/20 | 0,58 | -8 % | -54 % | -4,7 % | -36 % | -8 % | +15 % |

Aynı tablo kısmi dönemler için bileşik getiri; "en kötü gün" bakiyenin o günkü değişimi (3 pozisyon toplamı).


### Yıl yıl bileşik getiri (1/10 boy)

| stop | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | -27 % | -62 % | +59 % | -46 % | +7 % | -40 % | -6 % |
| +%15 gün içi yüksek | -35 % | -57 % | +76 % | -43 % | +3 % | +23 % | -1 % |
| +%25 gün içi yüksek | -37 % | -59 % | +64 % | -55 % | +1 % | +22 % | -4 % |
| +%15 15 dk kapanış | -37 % | -58 % | +63 % | -46 % | +1 % | +26 % | +6 % |
| +%25 15 dk kapanış | -38 % | -55 % | +59 % | -46 % | +5 % | +19 % | -5 % |

### Yıl yıl işlem başı ortalama (stopsuz) ve taban farkı

| yıl | işlem | pompa short | piyasa short | fark |
|---|---:|---:|---:|---:|
| 2020 | 639 | -0,460 % | -0,420 % | -0,040 % |
| 2021 | 1095 | -0,798 % | -0,647 % | -0,151 % |
| 2022 | 1095 | +0,481 % | +0,205 % | +0,276 % |
| 2023 | 1095 | -0,516 % | -0,421 % | -0,095 % |
| 2024 | 1098 | +0,106 % | -0,206 % | +0,312 % |
| 2025 | 1095 | -0,327 % | -0,035 % | -0,293 % |
| 2026 | 840 | +0,064 % | -0,163 % | +0,227 % |

### En kötü 8 işlem (stopsuz) ve stoplu hâli

| gün | coin | 24 sa önce | short (stopsuz) | +%15 yüksek | +%25 yüksek | gün içi en yüksek |
|---|---|---:|---:|---:|---:|---:|
| 2025-09-08 | MYXUSDT | +167 % | -308,0 % | -15,1 % | -25,2 % | +308 % |
| 2025-09-07 | MYXUSDT | +13 % | -172,5 % | -15,0 % | -25,0 % | +187 % |
| 2026-04-16 | SIRENUSDT | +11 % | -169,1 % | -15,6 % | -25,8 % | +155 % |
| 2026-03-22 | SIRENUSDT | +5 % | -152,5 % | -15,2 % | -25,2 % | +405 % |
| 2025-11-05 | GIGGLEUSDT | +78 % | -148,5 % | -15,2 % | -25,2 % | +164 % |
| 2025-11-04 | AIAUSDT | -3 % | -120,4 % | -15,0 % | -25,0 % | +155 % |
| 2021-04-16 | DOGEUSDT | +49 % | -98,7 % | -15,2 % | -25,2 % | +150 % |
| 2026-06-06 | SKYAIUSDT | +6 % | -82,5 % | -15,2 % | -25,2 % | +97 % |

### En kötü 5 gün (1/10 boy, bakiye değişimi)

| gün | stopsuz | +%15 yüksek | +%25 yüksek | coinler |
|---|---:|---:|---:|---|
| 2025-09-08 | -28,8 % | -1,6 % | -0,5 % | MYXUSDT, NMRUSDT, SOONUSDT |
| 2026-04-16 | -18,8 % | -3,4 % | -5,4 % | LYNUSDT, SIRENUSDT, TRUMPUSDT |
| 2025-09-07 | -18,7 % | -3,2 % | -4,0 % | NMRUSDT, MYXUSDT, PROVEUSDT |
| 2026-03-22 | -16,2 % | -2,3 % | -4,3 % | RIVERUSDT, POWERUSDT, SIRENUSDT |
| 2021-04-16 | -12,5 % | -1,9 % | -3,9 % | DOGEUSDT, MKRUSDT, ETCUSDT |

## Sıkışma günlerinin öncü işareti

Sıkışma = stopsuz short −%20'den kötü kapandı: 185 işlem (%2,7). Getiriler pozisyon nominali 1 birim alınarak toplanırsa bu işlemlerin toplamı -67,1 birim, bütün 6957 işleminki -13,9; sıkışmalar dışındaki işlemler toplamda +53,2. Gün içi +%25'e değen işlem payı %3,8.

| işaret | kapsam | AUC 1. yarı | AUC 2. yarı | beşlik sıkışma oranı (düşük → yüksek), tümü | beşlik ort. short getirisi |
|---|---:|---:|---:|---|---|
| coin 24 sa yükselişi | %100 | 0,702 | 0,652 | %1 · %2 · %2 · %3 · %5 | -0,3 % · -0,3 % · -0,3 % · -0,5 % · +0,4 % |
| coin 7 g getirisi | %100 | 0,674 | 0,611 | %2 · %1 · %2 · %2 · %6 | +0,1 % · +0,1 % · -0,5 % · +0,3 % · -0,9 % |
| hacim 24 sa / önceki 7 g ortalaması | %100 | 0,600 | 0,517 | %3 · %2 · %2 · %1 · %5 | -0,5 % · -0,1 % · +0,1 % · +0,2 % · -0,6 % |
| son fonlama oranı | %100 | 0,564 | 0,532 | %3 · %1 · %2 · %1 · %5 | -0,3 % · -0,2 % · -0,1 % · +0,2 % · -0,7 % |
| OI 24 sa değişimi | %77 | 0,670 | 0,469 | %3 · %2 · %1 · %2 · %3 | -0,5 % · -0,1 % · +0,1 % · -0,2 % · +0,3 % |
| büyük trader long/short (pozisyon) | %63 | 0,460 | 0,405 | %3 · %3 · %3 · %2 · %2 | -0,3 % · -0,3 % · -0,4 % · +0,1 % · +0,2 % |
| tüm hesaplar long/short | %76 | 0,219 | 0,344 | %5 · %3 · %2 · %1 · %1 | -1,2 % · +0,0 % · -0,2 % · +0,2 % · +0,8 % |
| BTC 24 sa | %100 | 0,528 | 0,495 | %3 · %3 · %2 · %2 · %4 | -0,9 % · -0,1 % · +0,4 % · +0,1 % · -0,5 % |
| sıra (1 = en çok yükselen) | %100 | 0,421 | 0,402 | %3 · %4 · %2 · %3 · %2 | -0,2 % · -0,1 % · -0,1 % · -0,4 % · -0,1 % |

AUC 0,5 = ayırmıyor; > 0,5 = işaret yüksekken sıkışma daha sık. OI ve long/short oranları metrics arşivinden (5 dk anlık görüntü, girişten en az 5 dk önce biten; en erken 2020-09, kapsam coine göre değişir).


## Aday süzgeç (ilk 30): tüm hesapların long/short oranı düşükken girme

Sıkışma tablosu veriye bakılarak okundu; bu bölüm yeni bir adayın ilk ölçüsü, kanıt değil. Eşik = metrics kapsamının (2020-09-04 → 2026-10-07) ilk yarısında oranın %20 dilimi: 0,960. Oran ≤ eşik ise o coin short edilmez (pozisyon boş kalır). İkinci yarı ve son 12 ay eşiğe göre örneklem dışı.

| | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|
| bütün işlemler, stopsuz | +0,139 % (1958) | -0,169 % (3331) | -0,126 % (2193) | +0,207 % (1098) |
| süzgeçten geçen, stopsuz | +0,415 % (1566) | +0,163 % (2516) | +0,301 % (1605) | +0,837 % (716) |
| süzgeçte kalan (oran ≤ eşik), stopsuz | -0,962 % (392) | -1,195 % (815) | -1,292 % (588) | -0,974 % (382) |
| süzgeçten geçen, +%15 gün içi yüksek | +0,418 % (1566) | +0,187 % (2516) | +0,327 % (1605) | +0,826 % (716) |
| geçenler − aynı gün piyasa short'u | +0,303 % | +0,366 % | +0,436 % | +0,668 % |
| eşik %10 dilimi (0,71), geçen, stopsuz | +0,333 % (1762) | +0,131 % (2888) | +0,251 % (1868) | +0,683 % (866) |
| eşik %30 dilimi (1,19), geçen, stopsuz | +0,410 % (1370) | +0,120 % (2151) | +0,094 % (1352) | +0,868 % (572) |
| eşik sabit 1,0 (1,00), geçen, stopsuz | +0,404 % (1541) | +0,155 % (2447) | +0,238 % (1559) | +0,819 % (693) |
| sıkışma oranı geçen / kalan | %0,9 / %4,8 | %2,2 / %5,0 | %2,5 / %5,8 | %3,6 / %6,3 |

| süzgeçli, boy | son bakiye | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz, 1/10 | 2,29 | +15 % | -31 % | -18,8 % | +80 % | +27 % | +67 % |
| stopsuz, 1/20 | 1,61 | +8 % | -16 % | -9,4 % | +36 % | +18 % | +32 % |
| +%15 gün içi yüksek, 1/10 | 2,60 | +17 % | -25 % | -4,6 % | +82 % | +43 % | +72 % |
| +%15 gün içi yüksek, 1/20 | 1,68 | +9 % | -13 % | -2,3 % | +37 % | +23 % | +33 % |

| yıl | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| geçenler, stopsuz, işlem başı | -2,078 % | +0,304 % | +0,719 % | -0,226 % | +0,102 % | +0,391 % | +0,392 % |
| kalanlar, stopsuz, işlem başı | -8,303 % | -1,364 % | -0,672 % | -1,222 % | +0,155 % | -2,681 % | -0,526 % |
| geçenler, +%15 stop, işlem başı | -2,078 % | +0,216 % | +0,643 % | -0,027 % | +0,081 % | +0,395 % | +0,391 % |

## Evren: ayın ilk 50 coini · 2020-06-02 → 2026-10-07 · 2319 gün, 6957 işlem

15 dk yerine 1 sa mumla işlenen işlem payı: %5,9.


### İşlem başı getiri (nominal üzerinden, maliyet + fonlama dahil)

| stop | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay | kazanma | stop olan |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | -0,070 % | -0,203 % | +0,062 % | +0,282 % | +0,680 % | %55,7 | — |
| +%15 gün içi yüksek | -0,045 % | -0,168 % | +0,077 % | +0,360 % | +0,520 % | %54,3 | %12,3 |
| +%25 gün içi yüksek | -0,124 % | -0,247 % | -0,002 % | +0,299 % | +0,406 % | %55,3 | %5,1 |
| +%15 15 dk kapanış | -0,070 % | -0,230 % | +0,089 % | +0,392 % | +0,476 % | %54,7 | %10,2 |
| +%25 15 dk kapanış | -0,062 % | -0,233 % | +0,109 % | +0,401 % | +0,558 % | %55,5 | %3,9 |

Fonlamanın işlem başı payı: -0,103 % (short lehine artı). Seçilen coinlerin 24 sa yükselişi medyan +9,2 %.


### Taban: aynı gün evrendeki bütün coinleri short (stopsuz, aynı maliyet) ve fark

| | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| pompa ilk 3, gün ort. | -0,070 % | -0,203 % | +0,062 % | +0,282 % | +0,680 % |
| piyasa short, gün ort. | -0,234 % | -0,307 % | -0,160 % | -0,074 % | +0,031 % |
| fark | +0,163 % (t 1,4) | +0,104 % (t 0,7) | +0,222 % (t 1,2) | +0,356 % (t 1,3) | +0,649 % (t 1,6) |

### Bileşik bakiye (pozisyon başına 1/10 ve 1/20 nominal)

| stop | boy | son bakiye (1 → ) | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | 1/10 | 0,34 | -16 % | -83 % | -28,8 % | -62 % | -10 % | +87 % |
| stopsuz | 1/20 | 0,68 | -6 % | -53 % | -14,4 % | -34 % | +3 % | +41 % |
| +%15 gün içi yüksek | 1/10 | 0,50 | -10 % | -76 % | -5,0 % | -54 % | +9 % | +63 % |
| +%15 gün içi yüksek | 1/20 | 0,78 | -4 % | -48 % | -2,5 % | -29 % | +9 % | +30 % |
| +%25 gün içi yüksek | 1/10 | 0,27 | -19 % | -87 % | -7,7 % | -66 % | -21 % | +41 % |
| +%25 gün içi yüksek | 1/20 | 0,58 | -8 % | -59 % | -3,8 % | -39 % | -6 % | +22 % |
| +%15 15 dk kapanış | 1/10 | 0,41 | -13 % | -82 % | -7,8 % | -63 % | +12 % | +54 % |
| +%15 15 dk kapanış | 1/20 | 0,71 | -5 % | -55 % | -3,9 % | -36 % | +11 % | +27 % |
| +%25 15 dk kapanış | 1/10 | 0,41 | -13 % | -82 % | -9,3 % | -65 % | +16 % | +66 % |
| +%25 15 dk kapanış | 1/20 | 0,72 | -5 % | -55 % | -4,6 % | -37 % | +14 % | +32 % |

Aynı tablo kısmi dönemler için bileşik getiri; "en kötü gün" bakiyenin o günkü değişimi (3 pozisyon toplamı).


### Yıl yıl bileşik getiri (1/10 boy)

| stop | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz | -39 % | -55 % | +53 % | -43 % | +11 % | -5 % | +35 % |
| +%15 gün içi yüksek | -40 % | -54 % | +74 % | -40 % | +0 % | +74 % | -1 % |
| +%25 gün içi yüksek | -45 % | -55 % | +51 % | -52 % | +0 % | +76 % | -16 % |
| +%15 15 dk kapanış | -42 % | -57 % | +59 % | -42 % | -1 % | +88 % | -3 % |
| +%25 15 dk kapanış | -45 % | -53 % | +55 % | -46 % | +6 % | +79 % | -1 % |

### Yıl yıl işlem başı ortalama (stopsuz) ve taban farkı

| yıl | işlem | pompa short | piyasa short | fark |
|---|---:|---:|---:|---:|
| 2020 | 639 | -0,711 % | -0,468 % | -0,244 % |
| 2021 | 1095 | -0,617 % | -0,705 % | +0,088 % |
| 2022 | 1095 | +0,451 % | +0,196 % | +0,256 % |
| 2023 | 1095 | -0,463 % | -0,431 % | -0,032 % |
| 2024 | 1098 | +0,145 % | -0,226 % | +0,371 % |
| 2025 | 1095 | +0,097 % | +0,054 % | +0,043 % |
| 2026 | 840 | +0,462 % | -0,127 % | +0,589 % |

### En kötü 8 işlem (stopsuz) ve stoplu hâli

| gün | coin | 24 sa önce | short (stopsuz) | +%15 yüksek | +%25 yüksek | gün içi en yüksek |
|---|---|---:|---:|---:|---:|---:|
| 2025-09-08 | MYXUSDT | +167 % | -308,0 % | -15,1 % | -25,2 % | +308 % |
| 2025-09-07 | MYXUSDT | +13 % | -172,5 % | -15,0 % | -25,0 % | +187 % |
| 2025-11-05 | GIGGLEUSDT | +78 % | -148,5 % | -15,2 % | -25,2 % | +164 % |
| 2026-06-06 | ALLOUSDT | +25 % | -100,5 % | -15,2 % | -25,2 % | +112 % |
| 2021-04-16 | DOGEUSDT | +49 % | -98,7 % | -15,2 % | -25,2 % | +150 % |
| 2021-01-02 | DOGEUSDT | +21 % | -80,8 % | -15,2 % | -25,2 % | +144 % |
| 2026-06-01 | LABUSDT | +18 % | -80,3 % | -15,7 % | -30,7 % | +80 % |
| 2025-05-09 | PNUTUSDT | +40 % | -77,2 % | -15,2 % | -25,2 % | +95 % |

### En kötü 5 gün (1/10 boy, bakiye değişimi)

| gün | stopsuz | +%15 yüksek | +%25 yüksek | coinler |
|---|---:|---:|---:|---|
| 2025-09-08 | -28,8 % | -1,6 % | -0,5 % | MYXUSDT, NMRUSDT, SOONUSDT |
| 2025-09-07 | -18,7 % | -3,1 % | -3,9 % | NMRUSDT, MYXUSDT, PYTHUSDT |
| 2026-06-06 | -12,6 % | -1,7 % | -3,7 % | ALLOUSDT, BEATUSDT, VVVUSDT |
| 2021-04-16 | -12,5 % | -1,9 % | -3,9 % | DOGEUSDT, MKRUSDT, ETCUSDT |
| 2025-11-07 | -11,0 % | -4,6 % | -7,7 % | AIAUSDT, FILUSDT, BLESSUSDT |

## Aday süzgeç (ilk 50): tüm hesapların long/short oranı düşükken girme

Sıkışma tablosu veriye bakılarak okundu; bu bölüm yeni bir adayın ilk ölçüsü, kanıt değil. Eşik = metrics kapsamının (2020-09-04 → 2026-10-07) ilk yarısında oranın %20 dilimi: 0,847. Oran ≤ eşik ise o coin short edilmez (pozisyon boş kalır). İkinci yarı ve son 12 ay eşiğe göre örneklem dışı.

| | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|
| bütün işlemler, stopsuz | +0,390 % (1150) | +0,064 % (1994) | +0,242 % (1272) | +1,043 % (615) |
| süzgeçten geçen, stopsuz | +0,749 % (920) | +0,626 % (1526) | +0,898 % (953) | +1,770 % (402) |
| süzgeçte kalan (oran ≤ eşik), stopsuz | -1,044 % (230) | -1,769 % (468) | -1,716 % (319) | -0,330 % (213) |
| süzgeçten geçen, +%15 gün içi yüksek | +0,774 % (920) | +0,414 % (1526) | +0,609 % (953) | +1,192 % (402) |
| geçenler − aynı gün piyasa short'u | +0,528 % | +0,817 % | +0,927 % | +1,302 % |
| eşik %10 dilimi (0,62), geçen, stopsuz | +0,629 % (1035) | +0,538 % (1744) | +0,859 % (1101) | +1,877 % (492) |
| eşik %30 dilimi (1,03), geçen, stopsuz | +0,879 % (805) | +0,603 % (1331) | +0,812 % (832) | +2,239 % (347) |
| eşik sabit 1,0 (1,00), geçen, stopsuz | +0,894 % (824) | +0,589 % (1362) | +0,826 % (850) | +2,199 % (351) |
| sıkışma oranı geçen / kalan | %1,4 / %6,5 | %2,3 / %6,8 | %2,7 / %8,2 | %4,2 / %8,0 |

| süzgeçli, boy | son bakiye | yıllık | en büyük düşüş | en kötü gün | 1. yarı | 2. yarı | son 12 ay |
|---|---:|---:|---:|---:|---:|---:|---:|
| stopsuz, 1/10 | 4,52 | +28 % | -18 % | -14,1 % | +92 % | +135 % | +94 % |
| stopsuz, 1/20 | 2,20 | +14 % | -9 % | -7,1 % | +40 % | +57 % | +41 % |
| +%15 gün içi yüksek, 1/10 | 3,44 | +22 % | -16 % | -4,6 % | +98 % | +74 % | +56 % |
| +%15 gün içi yüksek, 1/20 | 1,90 | +11 % | -8 % | -2,3 % | +42 % | +34 % | +26 % |

| yıl | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| geçenler, stopsuz, işlem başı | -2,933 % | +1,211 % | +1,148 % | +0,135 % | +0,360 % | +0,535 % | +1,616 % |
| kalanlar, stopsuz, işlem başı | — | -5,184 % | -0,445 % | -1,920 % | -1,000 % | -3,746 % | -0,162 % |
| geçenler, +%15 stop, işlem başı | -2,933 % | +1,094 % | +1,086 % | +0,311 % | +0,235 % | +0,504 % | +0,730 % |
