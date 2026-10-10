# Büyük işlem akışı + lambdarank · 2026-10-09

340,241 satır, 15,432 saat, 103 coin (aggflow verisi olanlar), 2025-01 → 2026-10. Akış değişkenleri (15 ham + 15 saat içi sıra): 4/24/72 sa ≥10k, ≥100k ve küçük işlem dengesizliği, büyük − küçük farkı, büyük işlem payı ve sapması, işlem büyüklüğü sapması. Lambdarank ayarları ana koşuyla aynı (200 ağaç, saat içi onluk etiketi), eğitim testten 2 gün önce biter, eğitim yalnız 2025-01'den (akış verisinin başı).

| Test | Ufuk | denklem4 | + akış | yalnız akış | fark |
|---|---|---|---|---|---|
| 2025-10 → 2025-12 | 4 sa | +0,061 | +0,061 | +0,014 | +0,000 |
| 2025-10 → 2025-12 | 12 sa | +0,058 | +0,061 | +0,004 | +0,003 |
| 2026-01 → 2026-03 | 4 sa | +0,041 | +0,042 | +0,019 | +0,001 |
| 2026-01 → 2026-03 | 12 sa | +0,051 | +0,054 | +0,020 | +0,003 |
| 2026-04 → 2026-06 | 4 sa | +0,045 | +0,053 | +0,018 | +0,008 |
| 2026-04 → 2026-06 | 12 sa | +0,043 | +0,042 | +0,017 | -0,002 |
| 2026-07 → 2026-09 | 4 sa | +0,032 | +0,041 | +0,010 | +0,009 |
| 2026-07 → 2026-09 | 12 sa | +0,016 | +0,015 | +0,003 | -0,001 |
| 2026-10 → 2026-10 | 4 sa | +0,101 | +0,121 | +0,067 | +0,019 |
| 2026-10 → 2026-10 | 12 sa | +0,129 | +0,154 | +0,068 | +0,026 |

Ağırlıklı ortalama (test satır sayısıyla):

- 4 sa: denklem4 +0,045, + akış +0,050, yalnız akış +0,016; akış değişkenlerinin kazanç payı (gain) ort, %16
- 12 sa: denklem4 +0,043, + akış +0,044, yalnız akış +0,012; akış değişkenlerinin kazanç payı (gain) ort, %17
