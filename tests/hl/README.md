# Hyperliquid trader verisi (test #38, 9–10 Ekim 2026)

Not: `/mnt/project-files/arastirma/dongu/2026-10-10-hyperliquid-trader.md`. Ham veri: `/mnt/project-files/veri-arsivi/hyperliquid/hl-2026-10-10.tar.gz`.

Hepsi aynı klasörde çalışır (çıktılar çalışma klasörüne yazılır). Hyperliquid IP başına dakikada ~1200 ağırlık verir; `hl.py` istekleri 1 sn arayla gönderir, 429'da bekler.

1. `python3 fetch_pf.py 6500` — lider tablosundan (aylık hacim ≥ 1 M $, kaybedenler dahil) rastgele hesapların `portfolio` geçmişi → `pf.jsonl` (~2 sa).
2. `python3 persist.py 30 1` — aylık PnL/ROI sırasının ertesi aya kalıcılığı; `deciles.py` onluk tablosu.
3. `python3 fetch_mkt.py` — en hacimli 45 coinin 1 sa mumu ve saatlik fonlaması (Mayıs 2026'dan) → `mkt.json`.
4. `python3 groups.py` — her ay başı yalnız geçmiş 90 günle iyi / kötü / büyük / küçük gruplar → `groups.json`, `users.json`.
5. `python3 fetch_fills.py users.json` — grupların Haziran'dan beri dolumları + bugünkü pozisyonu → `fills.jsonl` (~2 sa).
6. `python3 coin.py` — grupların coin bazında net pozisyonu / 4 sa akışı → sonraki 4 ve 12 sa kesitsel getiri (fonlama düşülmüş) IC, momentum ve fonlamadan arındırılmış IC (`|art`).
