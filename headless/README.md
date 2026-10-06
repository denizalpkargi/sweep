# Ekransız kâğıt bot

Tarayıcı ya da Electron penceresi açık olmadan aynı motoru ve **Masa (komite)** modunu 7/24 çalıştırır. Sanal bakiye, gerçek fiyat; emir göndermez.

```
npm run bot                          # bot-data/ altında çalışır
node headless/run.js --dir bot-data --every 300000 --min-vol 10000000 --votes deep
node headless/run.js --once          # tek tarama + karar, sonra çıkar (deneme için)
```

Gereken: Node 22+ (yerleşik `fetch` ve `WebSocket`). `npm install` gerekmez. Binance ABD IP'lerini engeller; sunucu ABD dışında olmalı.

## Ne yapar

- Her 5 dakikada UI ile aynı tarama: evren (10 M$ hacim, ilk 120) → hızlı tarama → en iyi 24 aday derin tarama.
- Taramadan sonra ve dakikada bir masa toplanır; eşik 0,30, 4/8 evet, Can vetosu yoksa market giriş. Giriş fiyatı açılıştan hemen önce REST'ten taze alınır.
- Açık pozisyonlar tek WebSocket'te (trade, bookTicker, markPrice); akış 6 sn susarsa REST'ten 3 sn'de bir fiyat.
- 30 sn'de bir (pozisyon başına 2 dk) masa pozisyonu yeniden değerlendirir: çık, azalt, süre doldu, kârı kilitle, ekle (UI `botManage` ile aynı).
- Liderler (kopya trader) 10 dk'da bir kontrol edilir, saatte bir yenilenir. Node'da CORS yok, doğrudan çekilir.
- Yeniden başlatınca kapalı kalınan süre 1 dk mumlarla oynatılır (önce ters uç, sonra lehte uç; muhafazakâr).
- Günlük sınırlar yerel güne göre; `TZ` verilmezse `Europe/Istanbul`.

Risk ayarları UI varsayılanlarıdır (`BOT_CFG_DEF`, `src/committee.js`). Değiştirmek için `bot-data/config.json` yaz, örneğin `{"risk":0.02}`; başlangıç satırı geçerli ayarları günlüğe yazar.

## Dosyalar (`bot-data/`)

| Dosya | İçerik |
|---|---|
| `bot.json` | durum: bakiye, açık pozisyonlar, işlemler, günlük sayaç |
| `status.json` | 30 sn'de bir nabız: özkaynak, pozisyonlar, son tarama, fiyat kaynağı |
| `store.json` | motorun localStorage'ı: coin tutarlılığı önbelleği, liderler |
| `logs/votes-GGGG-AA-GG.jsonl` | her taramada masa oyu: puan, evet/hayır, veto, ajan başına `[oy, güven]`, `feat` (masanın kullandığı ham girdiler) |
| `logs/events-*.jsonl` | bot olayları: tarama, giriş, hedef, stop, fonlama, masa konuşmaları |
| `logs/reviews-*.jsonl` | açık pozisyonun 2 dakikalık gözden geçirmeleri ve alınan aksiyon |
| `logs/trades.jsonl` | kapanan her işlem: giriş anındaki özellikler + sonuç (R, en iyi/en kötü R, çıkışlar) |

`--votes`: `deep` (varsayılan; derin taranan, eşiğe 0,15 yakın ya da giriş alan coin × yön), `all` (her coin × yön, günde ~70 MB), `go`, `none`.

Kısa analiz: `jq -s 'map(.r)|add/length' bot-data/logs/trades.jsonl` (işlem başına ortalama R).

## Sunucuda sürekli çalıştırma (systemd)

```
[Unit]
Description=SWEEP kâğıt bot
After=network-online.target

[Service]
WorkingDirectory=/opt/sweep
ExecStart=/usr/bin/node headless/run.js --dir /opt/sweep/bot-data --quiet
Restart=always
RestartSec=10
Environment=TZ=Europe/Istanbul

[Install]
WantedBy=multi-user.target
```

`pm2 start headless/run.js --name sweep -- --dir bot-data` de olur.
