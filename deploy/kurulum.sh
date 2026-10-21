#!/usr/bin/env bash
# SWEEP ekransız botunu bir Linux sunucuya (Oracle Cloud Always Free, Ubuntu 22.04/24.04) kurar.
# Kullanım (sunucuda, ubuntu kullanıcısıyla):
#   curl -fsSL https://raw.githubusercontent.com/denizalpkargi/sweep/main/deploy/kurulum.sh | bash
# Yaptıkları: Binance erişim denetimi → Node 22 → depo /opt/sweep → takas alanı (RAM < 2 GB ise) →
#   systemd: sweep-bot (7/24), sweep-guncelle (günde bir git pull, kod değiştiyse yeniden başlat), sweep-yedek (isteğe bağlı, saatte bir).
set -euo pipefail
REPO=${REPO:-https://github.com/denizalpkargi/sweep.git}
DIR=${DIR:-/opt/sweep}
U=${SUDO_USER:-$(id -un)}

echo "1/6 Binance vadeli API erişimi"
code=$(curl -s -o /tmp/sweep-ping -w '%{http_code}' https://fapi.binance.com/fapi/v1/time || true)
if [ "$code" != "200" ]; then
  echo "HATA: fapi.binance.com HTTP $code döndü. Bu sunucunun bölgesi Binance vadeliye kapalı (ABD 451 verir)."
  echo "Sunucuyu Frankfurt / Amsterdam / Tokyo gibi bir bölgede aç."; cat /tmp/sweep-ping 2>/dev/null | head -c 300; echo; exit 1
fi
echo "   tamam ($(cat /tmp/sweep-ping))"

echo "2/6 Node 22"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y git >/dev/null
node -v

echo "3/6 Depo $DIR"
if [ -d "$DIR/.git" ]; then sudo -u "$U" git -C "$DIR" pull --ff-only; else sudo git clone "$REPO" "$DIR"; sudo chown -R "$U:$U" "$DIR"; fi
mkdir -p "$DIR/bot-data"

echo "4/6 Takas alanı"
mem=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
if [ "$mem" -lt 2048 ] && ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null; echo "   2 GB takas eklendi (RAM ${mem} MB)"
else echo "   gerek yok (RAM ${mem} MB)"; fi

echo "5/6 Ayar dosyası /etc/sweep.env"
[ -f /etc/sweep.env ] || sudo install -m 600 "$DIR/deploy/sweep.env.ornek" /etc/sweep.env

echo "6/6 systemd"
for f in sweep-bot.service sweep-guncelle.service sweep-guncelle.timer sweep-yedek.service sweep-yedek.timer; do
  sed -e "s#@DIR@#$DIR#g" -e "s#@USER@#$U#g" "$DIR/deploy/$f" | sudo tee /etc/systemd/system/$f >/dev/null
done
sudo systemctl daemon-reload
sudo systemctl enable --now sweep-bot.service sweep-guncelle.timer
if grep -q '^SWEEP_YEDEK_REPO=.\+' /etc/sweep.env; then sudo systemctl enable --now sweep-yedek.timer; fi
sleep 5; systemctl --no-pager status sweep-bot.service | head -12
echo
echo "Kuruldu. Canlı günlük: journalctl -u sweep-bot -f   ·   durum: cat $DIR/bot-data/status.json"
