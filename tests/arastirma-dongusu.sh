#!/usr/bin/env bash
# Araştırma döngüsü (8 Ekim 2026): bulutta, bilgisayar kapalıyken de çalışır. Binance REST'e istek atmaz; veri data.binance.vision arşivinden.
# Adımlar: önbellekteki arşivi aç → son günleri ekle (fetch-archive --update) → masa örnekleri (motor değiştiyse ya da 7 günden eskiyse
# yeniden üret, 4 çekirdek) → hata örneklemi (geçmiş + son canlı kayıt) → önbelleği geri yaz.
# Kullanım: bash tests/arastirma-dongusu.sh   (ortam: VERI önbellek klasörü, CIKTI rapor klasörü, CANLI canlı kayıt klasörü)
set -euo pipefail
cd "$(dirname "$0")/.."
PF=/mnt/project-files
VERI=${VERI:-$PF/veri-arsivi}; CIKTI=${CIKTI:-$PF/arastirma/hata-orneklemi}; CANLI=${CANLI:-$PF/canli-kayit}
ARCH=tests/data/arch; GUN=$(date -u +%F); NP=${NP:-$(nproc)}
mkdir -p "$VERI" "$CIKTI" "$ARCH"
t0=$(date +%s); el(){ echo "[$(( $(date +%s)-t0 )) sn] $*"; }

# 1) arşiv önbelleği (CSV'ler; ham zip'ler saklanmaz)
if [ ! -d "$ARCH/1d" ] && [ -f "$VERI/arch-csv.tar.gz" ]; then el "arşiv önbellekten açılıyor"; tar -xzf "$VERI/arch-csv.tar.gz" -C "$ARCH"; fi
el "arşiv güncelleniyor"; node tests/fetch-archive.js --update --conc 24 | grep -v '^  ' || true
rm -rf "$ARCH/zip"

# 2) masa örnekleri: motor kodu (src + yeniden oynatma betikleri) değiştiyse ya da 7 günden eskiyse yeniden üret
HASH=$(cat src/*.js tests/masa-archive.js tests/backtest-masa.js tests/engine-node.js | sha1sum | cut -c1-12)
OLD=$(cat "$VERI/samples.hash" 2>/dev/null || echo yok)
AGE=$(( ( $(date +%s) - $(stat -c %Y "$VERI/samples.tar.gz" 2>/dev/null || echo 0) ) / 86400 ))
if [ "$HASH" = "$OLD" ] && [ "$AGE" -lt 7 ] && ! ls $ARCH/samples-*.jsonl >/dev/null 2>&1; then el "masa örnekleri önbellekten"; tar -xzf "$VERI/samples.tar.gz" -C "$ARCH"; fi
if ! ls $ARCH/samples-*.jsonl >/dev/null 2>&1 || [ "$HASH" != "$OLD" ] || [ "$AGE" -ge 7 ]; then
  el "masa örnekleri yeniden üretiliyor ($NP parça; motor $OLD → $HASH, yaş $AGE gün)"; rm -f $ARCH/samples-*.jsonl
  for i in $(seq 0 $((NP-1))); do node tests/masa-archive.js $i $NP > "/tmp/masa-$i.log" 2>&1 & done; wait
  tail -n1 /tmp/masa-*.log
  tar -czf "$VERI/samples.tar.gz.tmp" -C "$ARCH" $(cd $ARCH && ls samples-*.jsonl) && mv "$VERI/samples.tar.gz.tmp" "$VERI/samples.tar.gz"; echo "$HASH" > "$VERI/samples.hash"
fi

# 3) hata örneklemi: en yeni canlı kayıt (bilgisayardan çekilen state.json kopyası ya da elle yüklenen yedek)
LIVE=$(ls -t "$CANLI"/state-*.json "$PF"/sweep-yedek/sweep-geri-yukle*.json 2>/dev/null | head -1 || true)
el "hata örneklemi (canlı: ${LIVE:-yok})"
node tests/hata-orneklem.js --out "$CIKTI" --date "$GUN" ${LIVE:+--live "$LIVE"}

# 4) arşiv önbelleğini geri yaz (günde bir; arka planda kesilirse eski kopya kalır)
el "arşiv önbelleği yazılıyor"
tar -czf "$VERI/arch-csv.tar.gz.tmp" -C "$ARCH" 1d 1h 15m funding universe.json symbols.json && mv "$VERI/arch-csv.tar.gz.tmp" "$VERI/arch-csv.tar.gz"
el "bitti → $CIKTI/hata-orneklemi-$GUN.md"
