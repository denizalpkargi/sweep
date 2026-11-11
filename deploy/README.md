# SWEEP'i ücretsiz bulut sunucuda 7/24 çalıştırma

Ekransız bot (`headless/run.js`) Node 22 ile çalışır, ekran ve `npm install` istemez; bellek ~100 MB motor + tarama, 1 GB'lık makinede takasla sığar. Binance ABD IP'lerine HTTP 451 döner (bulut konteynerinde 21 Ekim 2026'da ölçüldü), bu yüzden sunucu **ABD dışında** olmalı.

## Seçim: Oracle Cloud Always Free, bölge Frankfurt

| Seçenek | Süre | Makine | Bölge | Uygun mu |
|---|---|---|---|---|
| **Oracle Cloud Always Free** | süresiz | Ampere A1 4 çekirdek / 24 GB (ya da AMD 1 GB) | Frankfurt, Amsterdam, Tokyo… | **evet** |
| Google Cloud e2-micro | süresiz | 2 vCPU paylaşımlı / 1 GB | yalnız ABD (us-west1, us-central1, us-east1) | hayır, Binance 451 |
| AWS / Azure ücretsiz katman | 6–12 ay ya da kredi | 1 GB | her yer | süre dolunca ücretli |
| Render, Railway, Fly.io ücretsiz | — | uyur ya da kaldırıldı, disk yok | — | hayır |

Oracle'da ana bölge (home region) hesap açılırken seçilir ve **sonradan değişmez**; ücretsiz makineler yalnız ana bölgede açılır. **Germany Central (Frankfurt)** seçin.

## Yalnız sizin yapabileceğiniz adımlar

1. **Hesap**: https://signup.oraclecloud.com → ülke Türkiye, ana bölge *Germany Central (Frankfurt)*. Kart doğrulaması ister (para çekmez). Hesap "Free Tier" kalsın; "Upgrade to Pay As You Go" yapmayın.
2. **Makine**: Compute → Instances → Create instance
   - Image: *Canonical Ubuntu 24.04*
   - Shape: *Ampere → VM.Standard.A1.Flex*, 2 OCPU / 12 GB (ücretsiz sınır 4 / 24). "Out of capacity" derse birkaç saat sonra tekrar deneyin ya da *VM.Standard.E2.1.Micro* (1 GB) seçin.
   - "Add SSH keys" → *Generate a key pair for me* → özel anahtarı indirin (`ssh-key-….key`).
   - Oluşunca *Public IP address*'i not edin.
3. **Bağlanma** (Windows PowerShell):
   ```
   ssh -i C:\Users\PC\Downloads\ssh-key-XXXX.key ubuntu@<IP>
   ```
4. **Kurulum** (sunucuda tek satır):
   ```
   curl -fsSL https://raw.githubusercontent.com/denizalpkargi/sweep/main/deploy/kurulum.sh | bash
   ```
   Önce Binance'e erişimi dener; 451 görürse durur. Sonra Node 22, depo `/opt/sweep`, gerekirse 2 GB takas, servisler.
5. **Kontrol**: `journalctl -u sweep-bot -f` ya da `tail -f /opt/sweep/bot-data/konsol.log`; özet `cat /opt/sweep/bot-data/status.json`.

## Araştırma döngüsünün canlı kaydı okuması (isteğe bağlı)

Bot saatte bir `bot-data`'dan araştırma döngüsünün okuduğu biçimde (`state.json`) kayıt üretip **özel** bir GitHub deposuna gönderir:

1. GitHub'da özel depo açın: `sweep-canli` (Private).
2. Sunucuda anahtar üretin: `ssh-keygen -t ed25519 -N "" -f ~/.ssh/sweep_yedek && cat ~/.ssh/sweep_yedek.pub`
3. Çıkan satırı depoda Settings → Deploy keys → Add deploy key, *Allow write access* işaretli.
4. `sudo nano /etc/sweep.env` → `SWEEP_YEDEK_REPO=git@github.com:denizalpkargi/sweep-canli.git`, sonra `sudo systemctl enable --now sweep-yedek.timer`. Hemen denemek: `sudo systemctl start sweep-yedek && journalctl -u sweep-yedek -n 5`.
5. Claude projesine `sweep-canli` deposunu ekleyin; araştırma döngüsü (`tests/arastirma-dongusu.sh`) `../sweep-canli` varsa son kaydı oradan alır.

Depoya giden: `canli-kayit/state-latest.json` ve günlük kopyalar (son 14), `status.json`, `trades.jsonl`, son 3 günün JSONL günlükleri (gzip), `research/`. Hesap anahtarı (`st-acct`) ve LLM anahtarı yazılmaz.

## Bakım

- Kod her gece 03:30'da `main`'den çekilir; `src/` ya da `headless/` değiştiyse bot yeniden başlar (açık pozisyonlar devam eder, aradaki süre 1 dk mumlarla oynatılır).
- Ayar: `/etc/sweep.env` (bayraklar, bellek, LLM) ve `/opt/sweep/bot-data/config.json` (risk vb., `headless/README.md`). Değişiklikten sonra `sudo systemctl restart sweep-bot`.
- Durdurmak: `sudo systemctl disable --now sweep-bot`.
- Ampere'de 12–24 GB RAM varsa Selim ve yapay zekâ masası için Ollama da kurulabilir (`curl -fsSL https://ollama.com/install.sh | sh && ollama pull qwen3:8b`, `/etc/sweep.env` → `LLM_PROVIDER=ollama`); 1 GB makinede kurmayın.
- Oracle "Always Free" hesaplarda boşta görünen makineleri geri alabilir (7 günde CPU, ağ ve (A1'de) bellek kullanımının %95'lik dilimi %20'nin altındaysa). Bot hafif olduğu için bu sınırın altında kalabilir. Kurulumdan sonra hesabı **Pay As You Go**'ya çevirin: ücretsiz kaynaklar yine 0 $, geri alma kuralı kalkar. Billing → Budgets'ta 1 $'lık bütçe uyarısı kurun.
