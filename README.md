# SWEEP · Likidite Terminali

Binance USDⓈ-M vadeli piyasası için tek dosyalık (kurulumsuz) analiz terminali ve kâğıt (sanal bakiye) bot.
Strateji: AMD (birikim–manipülasyon–dağıtım) · likidite süpürmesi · emir akışı teyidi · yapı kırılımı (MSS) · OTE girişi · 10 kapı disiplini; yan kurulumlar: kırılım + FVG geri testi, kutu/POC geri testi.

- Çalıştırmak için `site/index.html` dosyasını Chrome/Edge ile aç. API anahtarı gerekmez.
- Canlı veri: `wss://fstream.binance.com` + REST `fapi.binance.com`.
- Geliştirme: `npm install` → `npm run build` (src/ → site/index.html) → `npm test`.
- Yayın: `site/` klasörü olduğu gibi GitHub Pages / Netlify'a konur (PWA: manifest + service worker hazır).
- Windows paketi: `npm run pack:win` (Windows'ta çalıştırınca ikon da gömülür).

Ayrıntılı mimari ve yol haritası: `CLAUDE.md`.
