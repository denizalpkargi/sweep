#!/bin/bash
# Test #99 için BTCUSDT spot günlük mumlar 2017-08 → 2019-12 (data.binance.vision S3) → tests/data/arch/btc-spot-1d.csv
set -e; D=$(mktemp -d); OUT="$(dirname "$0")/data/arch/btc-spot-1d.csv"
for y in 2017 2018 2019; do for m in 01 02 03 04 05 06 07 08 09 10 11 12; do f=BTCUSDT-1d-$y-$m.zip
  curl -sf -o "$D/$f" "https://s3-ap-northeast-1.amazonaws.com/data.binance.vision/data/spot/monthly/klines/BTCUSDT/1d/$f" || rm -f "$D/$f"; done; done
for z in "$D"/*.zip; do unzip -p "$z"; done | sort -n > "$OUT"; rm -rf "$D"; wc -l "$OUT"
