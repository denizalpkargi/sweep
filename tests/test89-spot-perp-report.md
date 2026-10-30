# Test #89 · spot ile perp taker akışı ayrışması (16 Ekim 2026)

Dönem 2020-03-01 → 2025-01-01, 185 coin, 10534 sinyal anı (4 sa), 24 sa tutuş, VWAP, 2 × %0,08 + fonlama, basit getiri.

Kesitsel sıra IC (D ↔ sonraki 24 sa getiri): ort. +0.0132, ilk yarı +0.0217, ikinci yarı +0.0048, son 12 ay +0.0022. Önceden beklenen işaret eksi.

| Koşul | Bacak | n | net % / işlem | ortalamadan fark % (brüt) | t (00 UTC, gün) | yarılar net % | son 12 ay net % |
|---|---|---|---|---|---|---|---|
| tümü | long (düşük D) | 52761 | -0.07 | -0.03 | -0.3 | -0.07 / -0.08 | -0.15 |
| tümü | short (yüksek D) | 63295 | -0.32 | -0.04 | -0.9 | -0.48 / -0.17 | -0.09 |
| r24 < 0 | long (düşük D) | 26650 | -0.04 | -0.06 | -0.2 | -0.06 / -0.03 | +0.05 |
| r24 < 0 | short (yüksek D) | 33801 | -0.26 | +0.08 | 0.6 | -0.41 / -0.12 | -0.14 |
| r24 > 0 | long (düşük D) | 26004 | -0.12 | -0.01 | 0.4 | -0.19 / -0.06 | -0.22 |
| r24 > 0 | short (yüksek D) | 29386 | -0.36 | -0.15 | -0.8 | -0.56 / -0.15 | -0.07 |

Taban (tüm coinler, aynı anlar): long net -0.04 %, short net -0.28 %.

