#!/usr/bin/env bash
# bot-data'dan araştırma döngüsünün okuyacağı canlı kaydı üretip özel bir GitHub deposuna gönderir.
#   canli-kayit/state-latest.json : Electron state.json biçimi ({t, data:{"st-bot","st-fc",...}}),
#                                   tests/hata-orneklem.js --live bunu doğrudan okur
#   status.json, trades.jsonl, logs/ (son 3 günün JSONL'leri, gzip), research/
# Ortam: SWEEP_YEDEK_REPO (git@github.com:<kullanıcı>/<özel depo>.git), SWEEP_YEDEK_KEY (deploy key).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${SWEEP_YEDEK_REPO:-}" ] || { echo "SWEEP_YEDEK_REPO boş, yedek kapalı"; exit 0; }
D=bot-data; W=${SWEEP_YEDEK_DIR:-$HOME/sweep-canli}
export GIT_SSH_COMMAND="ssh -i ${SWEEP_YEDEK_KEY:-$HOME/.ssh/sweep_yedek} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
if [ ! -d "$W/.git" ]; then git clone -q "$SWEEP_YEDEK_REPO" "$W" || { mkdir -p "$W"; git -C "$W" init -q -b main; git -C "$W" remote add origin "$SWEEP_YEDEK_REPO"; }; fi
git -C "$W" config user.name "sweep-bot"; git -C "$W" config user.email "sweep-bot@localhost"
git -C "$W" pull -q --rebase origin main 2>/dev/null || true
mkdir -p "$W/canli-kayit" "$W/logs" "$W/research"
node deploy/canli-kayit.js "$D" > "$W/canli-kayit/state-latest.json.tmp" && mv "$W/canli-kayit/state-latest.json.tmp" "$W/canli-kayit/state-latest.json"
cp "$W/canli-kayit/state-latest.json" "$W/canli-kayit/state-$(date -u +%F).json"
ls -t "$W"/canli-kayit/state-2*.json 2>/dev/null | tail -n +15 | xargs -r rm -f
cp "$D/status.json" "$W/" 2>/dev/null || true
cp "$D/logs/trades.jsonl" "$W/" 2>/dev/null || true
for f in $(ls -t "$D"/logs/*-20*.jsonl 2>/dev/null); do
  b=$(basename "$f"); day=$(echo "$b" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  [ "$day" \< "$(date -u -d '-3 day' +%F)" ] && continue
  gzip -c "$f" > "$W/logs/$b.gz"
done
cp -r "$D/research/." "$W/research/" 2>/dev/null || true
cd "$W"; git add -A
git diff --cached --quiet && { echo "değişiklik yok"; exit 0; }
git commit -q -m "canlı kayıt $(date -u +'%F %H:%M') UTC"
git push -q origin HEAD:main && echo "gönderildi"
