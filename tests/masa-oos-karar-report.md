# Kural masası ↔ eğitilmiş üyeli masa · 2026-10-12

masa-archive.js aynı dönem (2024-06-01 → 2026-10-09), ayın ilk 30 coini, 4 saatte bir iki yön. "oos": üyeler ileriye yürüyen eğitimin örneklem dışı dilimleriyle oy verir (canlıdaki model arşivin tamamıyla eğitildiği için kullanılmaz). Giriş = veto yok, puan ≥ 0,35, evet ≥ 3. R = botun planı (market giriş, stop ×2, 1,5R'de yarısı, 8 sa), maliyet dahil. İkiz = aynı sayıda rastgele veto dışı karar.

| Masa | Dönem | Toplantı | Giriş | Giriş R | İkiz R | Fark | Long R (n) | Short R (n) | Puan IC (4 sa) |
|---|---|---|---|---|---|---|---|---|---|
| Kural masası | tümü | 305,334 | 49,319 | -0,027 | -0,051 | +0,024 | -0,042 (19,587) | -0,017 (29,732) | -0,025 |
| Kural masası | 1. yarı | 152,218 | 24,715 | -0,015 | -0,050 | +0,035 | -0,037 (10,679) | +0,002 (14,036) | -0,025 |
| Kural masası | 2. yarı | 153,116 | 24,604 | -0,039 | -0,051 | +0,012 | -0,049 (8,908) | -0,034 (15,696) | -0,026 |
| Kural masası | son 12 ay | 130,100 | 20,980 | -0,033 | -0,052 | +0,018 | -0,041 (7,153) | -0,029 (13,827) | -0,024 |
| Eğitilmiş üyeli masa (örneklem dışı) | tümü | 305,334 | 45,826 | -0,047 | -0,051 | +0,003 | -0,064 (26,111) | -0,026 (19,715) | +0,023 |
| Eğitilmiş üyeli masa (örneklem dışı) | 1. yarı | 152,218 | 23,262 | -0,041 | -0,050 | +0,009 | -0,058 (13,094) | -0,019 (10,168) | +0,020 |
| Eğitilmiş üyeli masa (örneklem dışı) | 2. yarı | 153,116 | 22,564 | -0,054 | -0,052 | -0,002 | -0,069 (13,017) | -0,033 (9,547) | +0,024 |
| Eğitilmiş üyeli masa (örneklem dışı) | son 12 ay | 130,100 | 19,009 | -0,057 | -0,052 | -0,005 | -0,076 (11,017) | -0,031 (7,992) | +0,025 |

Modelle oy veren üye sayısı (oos): ortalama 7.9, hiç model oyu olmayan toplantı %1.

Koşu: kullanıcının bilgisayarında (dal 730f092), örnekler samples-oos-0..3 / samples-rule-0..3.jsonl, 305.334'er satır, bozuk satır yok.

Okuma: model oyları coin sırasını bilir (puan IC +0,02) ama yön bilmez; dilim > %50 olan her coin long için "evet" sayıldığından masa düşen piyasada da long açıyor (26 bin ↔ 20 bin long, −0,064R). Kural masası her dönemde rastgele ikizden +0,012…+0,035R iyi, model oylu masa değil. Sonuç: COM_DEF.uye varsayılan kapalı (kural oyu).
