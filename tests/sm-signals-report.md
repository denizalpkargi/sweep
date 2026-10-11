# Telegram sinyal kanalları · çağrılar fiyatla ölçüldü

Kaynak: kanalların herkese açık web önizlemesi (t.me/s), 2023-01-01 → 2026-10, kullanıcının PC'sinden indirildi. Yalnız giriş + stop + hedef içeren çağrılar; VIP'ten iletilen ya da tekrar paylaşılan aynı sinyal bir kez (ilk görünüş). Son 15 günün çağrıları sonucu belli olmadığı için dışarıda.
Ölçü: Binance vadeli (yoksa 1000'li perp, yoksa spot) 15 dk mumlar. Giriş: bölgenin yakın kenarına limit (fiyat zaten bölgedeyse sonraki 15 dk açılışı), "instant/now" çağrısında sonraki açılış, "buy stop"ta kırılımda; 72 saatte dolmazsa ya da dolmadan hedef 1 vurulursa işlem yok (Cornix kuralı). 14 gün sonra kapanış. Stop ve hedef aynı mumda → stop. Maliyet: limit %0,02, market %0,08; fonlama yok.
**A** = tamamı hedef 1'de; **B** = ilk 3 hedefe eşit böl, hedef 1'den sonra stop girişe. R = net ÷ |giriş − stop|. **Ayna** = aynı an ve dolum fiyatı, stop ve hedefler ters tarafta (yön bilgisi yoksa ayna ile aynı sonucu verir). **Rastgele saat** = aynı coin, aynı yön ve geometri, yayından ±10 gün içinde rastgele mumda market giriş. **Market** = aynı an, aynı plan, limit beklemeden giriş.

| Kanal | Çağrı | Fiyat bulunan | Doldu | Dolmadan hedef 1 | Dolmadı | Düzenlenmiş |
|---|---|---|---|---|---|---|
| cryptosignals.org | 1765 | 1644 | 1299 (79 %) | 188 (11 %) | 157 | 198 |
| Binance Killers (ücretsiz kanal) | 1248 | 1231 | 938 (76 %) | 277 (23 %) | 16 | 2 |
| Wallstreet Queen Official | 574 | 573 | 308 (54 %) | 79 (14 %) | 186 | 0 |
| Evening Trader | 131 | 111 | 99 (89 %) | 8 (7 %) | 4 | 0 |
| Raven Signals Pro | 59 | 59 | 49 (83 %) | 8 (14 %) | 2 | 9 |
| Binance Killers (ana kanal, VIP tekrarları) | 12 | 12 | 8 (67 %) | 2 (17 %) | 2 | 0 |
| AltSignals | 1 | 1 | 1 (100 %) | 0 (0 %) | 0 | 0 |

## Sonuç (R / işlem)

| Kanal | Yönetim | İşlem | Kazanan | Hedef 1 vuruldu | Ort. R | Medyan R | t | Ort. getiri % (kaldıraçsız) | Ort. stop % | Ayna R | Fark (çağrı − ayna) | Fark t | Rastgele saat R | Market giriş R | Long R (n) | Short R |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cryptosignals.org | A | 1299 | 63 % | 63 % | **-0,12** | 0,15 | -1,9 | -0,60 | 4,9 | -0,07 | -0,05 | -0,8 | -0,07 | -0,17 | -0,11 (553) | -0,12 |
| cryptosignals.org | B | 1299 | 59 % | 63 % | **-0,11** | 0,03 | -2,0 | -0,57 | 4,9 | -0,04 | -0,07 | -1,1 | -0,06 | -0,15 | -0,09 (553) | -0,12 |
| Binance Killers (ücretsiz kanal) | A | 938 | 82 % | 82 % | **-0,05** | 0,09 | -1,8 | -0,30 | 13,0 | 0,01 | -0,07 | -1,2 | -0,03 | -0,08 | -0,05 (782) | -0,06 |
| Binance Killers (ücretsiz kanal) | B | 938 | 81 % | 82 % | **-0,06** | 0,04 | -2,1 | -0,38 | 13,0 | 0,02 | -0,08 | -1,4 | -0,03 | -0,08 | -0,06 (782) | -0,06 |
| Wallstreet Queen Official | A | 308 | 72 % | 72 % | **0,00** | 0,28 | 1,0 | 0,05 | 7,4 | -0,08 | 0,08 | 2,1 | 0,09 | -0,17 | -0,06 (191) | 0,10 |
| Wallstreet Queen Official | B | 308 | 72 % | 72 % | **-0,02** | 0,11 | 0,5 | -0,11 | 7,4 | -0,07 | 0,05 | 1,5 | 0,10 | -0,12 | -0,11 (191) | 0,11 |
| Evening Trader | A | 99 | 52 % | 52 % | **-0,25** | 0,08 | -1,7 | -0,73 | 6,1 | -0,15 | -0,10 | -0,6 | 0,32 | -0,26 | -0,30 (55) | -0,18 |
| Evening Trader | B | 99 | 52 % | 52 % | **-0,26** | 0,02 | -1,7 | -0,81 | 6,1 | -0,18 | -0,08 | -0,4 | 0,10 | -0,26 | -0,28 (55) | -0,23 |
| Raven Signals Pro | A | 49 | 78 % | 78 % | **0,00** | 0,20 | -0,3 | -0,14 | 5,2 | -0,04 | 0,05 | 0,3 | -0,03 | -0,02 | 0,02 (42) | -0,12 |
| Raven Signals Pro | B | 49 | 76 % | 78 % | **-0,02** | 0,10 | -0,3 | -0,29 | 5,2 | -0,05 | 0,03 | 0,1 | -0,11 | -0,03 | 0,01 (42) | -0,18 |
| Binance Killers (ana kanal, VIP tekrarları) | A | 8 | 100 % | 100 % | **0,16** | 0,14 | 4,4 | 1,96 | 15,6 | -0,14 | 0,30 | 1,6 | -0,01 | 0,04 | 0,11 (4) | 0,22 |
| Binance Killers (ana kanal, VIP tekrarları) | B | 8 | 100 % | 100 % | **0,12** | 0,10 | 4,5 | 2,36 | 15,6 | -0,07 | 0,20 | 0,9 | 0,08 | 0,07 | 0,16 (4) | 0,09 |
| AltSignals | A | 1 | 0 % | 0 % | **-1,02** | -1,02 | – | -6,29 | 6,2 | 0,44 | -1,46 | – | -0,35 | -1,03 | -1,02 (1) | – |
| AltSignals | B | 1 | 0 % | 0 % | **-1,02** | -1,02 | – | -6,29 | 6,2 | 0,14 | -1,15 | – | -0,58 | -1,03 | -1,02 (1) | – |

## Yıl yıl (A yönetimi, işlem / ort. R)

| Kanal | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|
| cryptosignals.org | 209 / -0,10 | 420 / -0,14 | 563 / -0,10 | 107 / -0,14 |
| Binance Killers (ücretsiz kanal) | 344 / -0,01 | 298 / -0,01 | 205 / -0,23 | 91 / 0,05 |
| Wallstreet Queen Official | 108 / 0,03 | 95 / -0,02 | 80 / -0,08 | 25 / 0,20 |
| Evening Trader | – | – | – | 99 / -0,25 |
| Raven Signals Pro | 5 / 0,26 | 30 / -0,07 | 13 / 0,05 | 1 / 0,40 |
| Binance Killers (ana kanal, VIP tekrarları) | 4 / 0,15 | 2 / 0,07 | 1 / 0,37 | 1 / 0,16 |
| AltSignals | – | – | 1 / -1,02 | – |

## Kanalların kendi sonuç duyuruları

Sinyal metni olmayan (giriş içermeyen) mesajlarda hedef/kâr duyurusu ile stop/zarar duyurusu sayısı.

| Kanal | Mesaj | Kazanç duyurusu | Zarar duyurusu |
|---|---|---|---|
| Binance Killers (ana kanal, VIP tekrarları) | 15955 | 1627 | 38 |
| Binance Killers (ücretsiz kanal) | 6824 | 2030 | 19 |
| Wallstreet Queen Official | 4682 | 893 | 7 |
| cryptosignals.org | 10946 | 13 | 13 |
| AltSignals | 4350 | 2450 | 7 |
| Evening Trader | 2429 | 171 | 5 |
| Raven Signals Pro | 2068 | 578 | 9 |
| fatpigsignals | 532 | 328 | 0 |

_python3 tests/sm-signals-report.py_
