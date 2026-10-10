# Test #16 · Masa koşucusunda iz stop = 2,5 × ATR (6 sa karşılığı)

10 Ekim 2026 · `node tests/test16-iz-stop.js`

## Ne yapıldı

Masa örneklerinden (`tests/data/arch/samples-*.jsonl`, 821.834 toplantı, 4 saatte bir iki yön, ayın ilk 30 coini) bugünkü giriş kuralını geçen **134.421 karar** (veto yok, puan ≥ 0,35, evet ≥ 3; 2020-06-01 → 2026-10-08) 15 dk mumlarla yeniden oynatıldı. Giriş market (taker %0,05 + kayma %0,03), stop örnekteki masa stopu (`sd`), hedef 1 = 1,5R'de %50 (maker) + stop girişe, hedef 2 = 3R (karşı trendde 2R) %60 (maker), zaman stopu 8 sa; her fonlama anında kalan miktar düşülür/eklenir. Mum içinde önce ters uç, sonra lehte uç, sonra kapanış (backtest-masa `simBot` ile aynı).

Doğrulama: kopya adım fonksiyonu 3000 kararda motorun `paperStep`'iyle 0 farklı; fonlamasız R örnekteki R'den >0,01 farklı 1/3000.

Çıkış kuralları (hepsi hedef 1'den sonraki kalan pozisyona uygulanır):

- **bugün**: iz = tepe − 1 × risk0 (hedef 2'den sonra 0,7 × risk0)
- **ATR √24**: iz = tepe − 2,5 × ATR15(14) × √24 (test listesindeki "6 sa karşılığı")
- **ATR 6 sa**: iz = tepe − 2,5 × ATR(14), gerçek 6 sa mumlarından
- **iz yok**: stop girişte kalır

ATR uzaklığının risk cinsinden boyu: medyan +6,02R (√24), +6,27R (6 sa mumu). Yani 8 saatlik pozisyonda iz neredeyse hiç devreye girmiyor.

## Ortalama R (fonlama dahil), zaman stopu 8 sa

| kural | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| bugün (1R / 0,7R iz) | -0,111 | -0,119 | -0,102 | -0,104 | -0,114 |
| 2,5 × ATR √24 | -0,131 | -0,140 | -0,122 | -0,121 | -0,134 |
| 2,5 × ATR 6 sa mumu | -0,131 | -0,140 | -0,121 | -0,122 | -0,135 |
| iz yok | -0,132 | -0,141 | -0,124 | -0,124 | -0,139 |
| fark ATR √24 − bugün | -0,020 (t -24,3) | -0,021 (t -17,9) | -0,019 (t -16,4) | -0,017 (t -11,3) | -0,021 (t -9,2) |
| fark ATR 6 sa − bugün | -0,020 (t -24,1) | -0,021 (t -17,9) | -0,019 (t -16,2) | -0,017 (t -11,3) | -0,021 (t -9,3) |
| işlem | 134.421 | 67.264 | 67.157 | 42.079 | 21.043 |

## Ortalama R (fonlama dahil), zaman stopu 24 sa

| kural | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| bugün (1R / 0,7R iz) | -0,071 | -0,086 | -0,057 | -0,062 | -0,070 |
| 2,5 × ATR √24 | -0,086 | -0,104 | -0,068 | -0,072 | -0,088 |
| 2,5 × ATR 6 sa mumu | -0,086 | -0,104 | -0,068 | -0,072 | -0,089 |
| iz yok | -0,089 | -0,106 | -0,073 | -0,077 | -0,095 |
| fark ATR √24 − bugün | -0,015 (t -11,8) | -0,018 (t -10,2) | -0,011 (t -6,6) | -0,010 (t -4,2) | -0,018 (t -5,5) |
| fark ATR 6 sa − bugün | -0,014 (t -11,7) | -0,018 (t -10,3) | -0,011 (t -6,3) | -0,010 (t -4,4) | -0,019 (t -5,9) |
| işlem | 134.421 | 67.264 | 67.157 | 42.079 | 21.043 |

## Yalnız hedef 1'e ulaşan işlemler (kuralın değdiği yer, 8 sa)

Hedef 1'e ulaşan pay: %30,0 (40.340 işlem).

| kural | tümü | 1. yarı | 2. yarı | son 24 ay | son 12 ay |
|---|---:|---:|---:|---:|---:|
| bugün (1R / 0,7R iz) | +1,447 | +1,446 | +1,449 | +1,452 | +1,461 |
| 2,5 × ATR √24 | +1,380 | +1,377 | +1,383 | +1,393 | +1,385 |
| 2,5 × ATR 6 sa mumu | +1,380 | +1,377 | +1,384 | +1,393 | +1,384 |
| iz yok | +1,375 | +1,374 | +1,376 | +1,386 | +1,369 |

## Çıkış nedenleri (8 sa, tümü)

| kural | stop | hedef 1 sonrası stop/iz | zaman | hedef 2 sonrası iz | veri sonu |
|---|---:|---:|---:|---:|---:|
| bugün (1R / 0,7R iz) | %47,9 | %21,8 | %24,7 | %5,6 | %0,0 |
| 2,5 × ATR √24 | %47,9 | %10,0 | %40,2 | %1,8 | %0,0 |
| 2,5 × ATR 6 sa mumu | %47,9 | %10,0 | %40,2 | %1,9 | %0,0 |
| iz yok | %47,9 | %10,0 | %40,6 | %1,5 | %0,0 |

## Yıl yıl (8 sa)

| yıl | işlem | bugün | ATR √24 | ATR 6 sa | iz yok |
|---|---:|---:|---:|---:|---:|
| 2020 | 12.424 | -0,156 | -0,181 | -0,181 | -0,181 |
| 2021 | 20.021 | -0,081 | -0,102 | -0,101 | -0,103 |
| 2022 | 22.085 | -0,111 | -0,133 | -0,133 | -0,134 |
| 2023 | 21.894 | -0,127 | -0,148 | -0,148 | -0,150 |
| 2024 | 20.624 | -0,108 | -0,130 | -0,129 | -0,130 |
| 2025 | 21.208 | -0,094 | -0,106 | -0,106 | -0,110 |
| 2026 | 16.165 | -0,115 | -0,137 | -0,137 | -0,138 |

Fonlamanın payı (bugün, 8 sa): ortalama -0,0027R.
