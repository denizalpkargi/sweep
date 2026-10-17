# Test #72 · Deneme sayısı kaydı ve deflated Sharpe

13 Ekim 2026 · `node tests/test72-dsr.js` · sepetler canlı kodla arşivde (ayın ilk 50 coini, 2020-06-03 → 2026-10-11), günlük getiri. Deneme sayıları `tests/deneme-kaydi.json`.

DSR, gözlenen Sharpe'ın N denemenin en iyisi olmasından beklenen şans Sharpe'ını geçme olasılığıdır. Denemeler arası Sharpe varyansı bilinmediği için boş hipotezdeki tek deneme hatası kullanıldı (denemeler birbirine çok benzer olduğundan gerçek varyans bundan küçük olabilir; o zaman DSR burada yazandan yüksektir).

| sepet | dönem | gün | yıllık Sharpe | çarpıklık | basıklık | PSR(0) | DSR N=167 (sosyal 4 sa) | DSR N=541 (günlük aile) | DSR N=1439 (masa+15 dk) | DSR N=6200 (proje) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Kaplumbağa | tümü | 2322 | 1,09 | 0,18 | 12,4 | 0,997 | 0,520 | 0,374 | 0,274 | 0,162 |
| Kaplumbağa | 1. yarı | 1161 | 1,40 | 0,06 | 11,2 | 0,993 | 0,410 | 0,275 | 0,190 | 0,103 |
| Kaplumbağa | 2. yarı | 1161 | 0,70 | 0,39 | 10,7 | 0,894 | 0,073 | 0,034 | 0,018 | 0,006 |
| Kaplumbağa | son 12 ay | 366 | 0,65 | 2,29 | 33,3 | 0,751 | 0,021 | 0,008 | 0,004 | 0,001 |
| Ichimoku | tümü | 2322 | 1,54 | 1,06 | 6,9 | 1,000 | 0,907 | 0,830 | 0,750 | 0,614 |
| Ichimoku | 1. yarı | 1161 | 1,39 | 1,08 | 7,0 | 0,995 | 0,443 | 0,304 | 0,213 | 0,119 |
| Ichimoku | 2. yarı | 1161 | 1,70 | 1,03 | 6,8 | 0,999 | 0,675 | 0,534 | 0,422 | 0,280 |
| Ichimoku | son 12 ay | 366 | 1,36 | 0,49 | 4,1 | 0,917 | 0,093 | 0,046 | 0,024 | 0,009 |
| 50/50 | tümü | 2322 | 1,91 | 0,72 | 8,4 | 1,000 | 0,987 | 0,969 | 0,943 | 0,884 |
| 50/50 | 1. yarı | 1161 | 2,03 | 0,60 | 7,9 | 1,000 | 0,838 | 0,732 | 0,632 | 0,481 |
| 50/50 | 2. yarı | 1161 | 1,78 | 0,89 | 8,2 | 0,999 | 0,719 | 0,583 | 0,471 | 0,324 |
| 50/50 | son 12 ay | 366 | 1,49 | 1,59 | 13,3 | 0,942 | 0,129 | 0,067 | 0,037 | 0,015 |

## İşlem başı / haftalık t ile raporlanan adaylar (normal yaklaşık, DSR ≈ Φ(t − E[max Z_N]))

E[max Z_N]: N=167 → 2,71, N=541 → 3,08, N=1439 → 3,36, N=6200 → 3,74.

| # | aday | t | kaynak | aile (N) | DSR aile | DSR proje (N=6200) |
|---|---|---:|---|---|---:|---:|
| #65 | Ichimoku 4 sa | 3,7 | fark t, 10.245 işlem | sosyal 4 sa (167) | 0,840 | 0,483 |
| #64 | Data Trader 4 sa | 2,9 | fark t, ana 20 | sosyal 4 sa (167) | 0,577 | 0,200 |
| K1 | Kaplumbağa 1 + BTC SMA200 | 4,2 | 801 işlem +0,93R | günlük aile (541) | 0,869 | 0,676 |
| #48 | Donchian 20 + oynaklık boyu | 2,4 | Sharpe 0,95 × √6,3 yıl | günlük aile (541) | 0,243 | 0,087 |
| KS | Kalite short 72 sa | 1,5 | haftalık t (işlem t 4,6 örtüşük) | masa+15 dk (1439) | 0,032 | 0,012 |
| #47 | 24 sa long | 0,3 | haftalık t | masa+15 dk (1439) | 0,001 | 0,000 |
| #67 | Opsiyon RR25 long | 2,0 | t ≈ 1,5–2 (üst uç) | proje (6200) | 0,041 | 0,041 |

## Gereken t

DSR ≥ 0,95 için gereken t: sosyal 4 sa (N=167) 4,4, günlük aile (N=541) 4,7, masa+15 dk (N=1439) 5,0, proje (N=6200) 5,4. DSR ≥ 0,5 için: 2,7, 3,1, 3,4, 3,7.
