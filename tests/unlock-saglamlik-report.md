# Token kilit açılımı short'u · sağlamlık turu (2026-10-15)

Olaylar tests/unlock-etkisi.py çıktısından: insider / özel satış payı açılımı, büyüklük serbest arzın ≥ %2.5'i ve ≤ %100 (üstü veri hatası), 2022-01'den (360 olay, 64 coin, 2022-01-01 → 2026-09-02). Short: giriş günü kapanışında, çıkış günü kapanışında; basit getiri, fonlama dahil (short pozitif fonlamayı alır), taker gidiş-dönüş %0,16; stoplu satırlarda stop günlük tepe ile, %0,2 kaymayla. Gün 0 = açılım günü (UTC).

## Temel kural ve dönemler (−7 → 0, stopsuz)

| dönem | olay | ort % | medyan % | t | kazanma |
|---|---|---|---|---|---|
| tümü | 359 | +3,16 | +4,92 | +3,4 | %67 |
| 1. yarı | 68 | +1,32 | +4,40 | +0,7 | %65 |
| 2. yarı | 291 | +3,59 | +5,06 | +3,4 | %67 |
| son 12 ay | 175 | +5,55 | +6,04 | +3,9 | %73 |
| 2022 | 16 | +5,27 | +3,89 | +2,1 | %75 |
| 2023 | 37 | -0,03 | +3,91 | -0,0 | %57 |
| 2024 | 56 | +0,37 | +3,56 | +0,2 | %62 |
| 2025 | 124 | +3,56 | +5,31 | +2,5 | %65 |
| 2026 | 126 | +4,66 | +5,74 | +2,6 | %71 |

## Plasebo (aynı coinler, açılımdan en az 14 gün uzak rastgele gün, aynı −7 → 0 short)

| | olay | ort % | medyan % | t | kazanma |
|---|---|---|---|---|---|
| açılım öncesi | 359 | +3,16 | +4,92 | +3,4 | %67 |
| plasebo | 207 | +1,25 | +3,47 | +1,1 | %60 |

## Giriş / çıkış günü varyantları (stopsuz, tümü)

| giriş → çıkış | olay | ort % | medyan % | t | kazanma |
|---|---|---|---|---|---|
| -10 → 0 | 359 | +2,82 | +5,26 | +2,5 | %63 |
| -7 → -1 | 359 | +2,46 | +3,46 | +2,8 | %64 |
| -7 → 0 | 359 | +3,16 | +4,92 | +3,4 | %67 |
| -7 → 1 | 359 | +4,09 | +5,35 | +4,5 | %66 |
| -5 → 0 | 359 | +2,17 | +3,56 | +2,4 | %65 |
| -3 → 0 | 359 | +1,31 | +1,77 | +2,1 | %61 |
| -14 → -7 | 359 | -0,51 | +0,50 | -0,6 | %53 |
| 0 → 7 | 359 | +0,49 | +1,76 | +0,6 | %56 |

## Gün içi stop (−7 → 0)

| stop | olay | ort % | medyan % | t | kazanma | stop vuran % | 2. yarı ort % | son 12 ay ort % |
|---|---|---|---|---|---|---|---|---|
| yok | 359 | +3,16 | +4,92 | +3,4 | %67 | %0 | +3,59 | +5,55 |
| %10 | 359 | +2,20 | +2,74 | +3,4 | %55 | %38 | +2,33 | +3,19 |
| %15 | 359 | +1,99 | +3,52 | +2,8 | %59 | %27 | +2,24 | +3,53 |
| %20 | 359 | +2,27 | +4,17 | +3,0 | %63 | %18 | +2,32 | +3,65 |
| %30 | 359 | +2,31 | +4,66 | +2,8 | %65 | %10 | +2,70 | +4,39 |

## Yoğunlaşma

En çok kazandıran 3 coin: EIGENUSDT (+146,4 %, 14 olay), GUNUSDT (+114,9 %, 7 olay), HUSDT (+93,5 %, 4 olay). Coin başına olay sayısı medyanı 3, en çok 28.

| | olay | ort % | medyan % | t | kazanma |
|---|---|---|---|---|---|
| tümü | 359 | +3,16 | +4,92 | +3,4 | %67 |
| ilk 3 coin hariç | 334 | +2,33 | +4,54 | +2,4 | %65 |
| coin başına ilk olay hariç | 295 | +3,05 | +4,42 | +3,6 | %65 |

## Portföy (−7 → 0, %15 stop, boy = risk ÷ %15, aynı anda en çok N short; kazanç çıkışta gerçekleşir)

| risk / işlem | N | işlem | yıllık % | en büyük düşüş % | son 12 ay % |
|---|---|---|---|---|---|
| %0.5 | 5 | 359 | +3,8 | -5,0 | +16,0 |
| %1.0 | 5 | 359 | +7,5 | -9,8 | +33,7 |
| %1.0 | 10 | 359 | +10,0 | -9,8 | +48,3 |
| %2.0 | 5 | 359 | +14,4 | -18,9 | +74,4 |

Okuma: kural açılımdan önceki 7 güne özgüyse plasebo ≈ 0 ve açılım öncesi belirgin artı olmalı; varyantlar komşu günlerde de artı olmalı; stop ortalamayı çok düşürmemeli; ilk 3 coin hariç de artı kalmalı. Uyarı: DefiLlama listesi bugünkü protokoller (hayatta kalan seçimi), takvim önceden bilinir varsayıldı.
## Değerlendirme

Geçti: ilk 3 coin hariç artı (+2,33 %, t 2,4); komşu giriş/çıkış günlerinde artı; etki son haftaya özgü (−14 → −7 ≈ 0, açılım sonrası 0 → +7 ≈ 0); stoplu (%15–30) t 2,8–3,4.
Dikkat: (1) Plasebo +1,25 %/hafta: bu coinler açılımdan bağımsız da zayıf; açılıma özgü fazla ≈ +1,9 % / işlem. (2) Kazancın çoğu 2025–2026'da; 2023 ≈ 0, 2024 +0,4 %, 1. yarı t 0,7. (3) DefiLlama listesi bugünkü protokoller; takvim önceden bilinir varsayıldı.
Öneri: kanıt değil, aday. Kâğıtta ayrı küçük sepet (işlem başı %0,5–1 risk, %20 stop, aynı anda en çok 5) ve açılımdan önceki 7 günde long vetosu; ayrıca "açılım takvimi yoğun coinler" genel zayıflığı (plasebo) ayrı faktör olarak test edilebilir.
