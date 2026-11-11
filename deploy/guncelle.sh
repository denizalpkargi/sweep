#!/usr/bin/env bash
# main dalını çeker; src/, headless/ ya da tests/engine-node.js değiştiyse botu yeniden başlatır (root olarak çalışır, git işlemleri SWEEP_USER ile).
# Yeniden başlatmada açık pozisyonlar bot.json'dan devam eder, aradaki süre 1 dk mumlarla oynatılır.
set -euo pipefail
cd "$(dirname "$0")/.."
G(){ runuser -u "${SWEEP_USER:-ubuntu}" -- git "$@"; }
old=$(G rev-parse HEAD)
G fetch -q origin main && G merge -q --ff-only origin/main || { echo "güncelleme atlandı (yerel değişiklik?)"; exit 0; }
new=$(G rev-parse HEAD)
[ "$old" = "$new" ] && { echo "kod aynı"; exit 0; }
if G diff --name-only "$old" "$new" | grep -qE '^(src/|headless/|tests/engine-node\.js)'; then
  echo "kod değişti ${old:0:7} → ${new:0:7}, bot yeniden başlatılıyor"; systemctl restart sweep-bot
else echo "yalnız belge/test değişti"; fi
