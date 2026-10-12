#!/usr/bin/env bash
# Kerem, Yusuf, Onur · bilgisayarda tam koşu (11 Ekim 2026): Ozan'ın arşivi (rank-*.f32) hazır olmalı (tests/uye-lambdarank-pc.sh),
# yeni değişkenler yoksa üretilir (tests/uye-ek-ozellik.js, 4 parça), sonra tests/uye-ek-lambdarank.py → tests/uye-ek-lambdarank-report.md
set -e
export PYTHONUTF8=1
cd "$(dirname "$0")/.."
PY=${PY:-python}; A=tests/data/arch
ls $A/uyeek-*.f32 >/dev/null 2>&1 || { for p in 0 1 2 3; do node tests/uye-ek-ozellik.js $p 4 > "$A/uyeek-$p.log" 2>&1 & done; wait; }
$PY tests/uye-ek-lambdarank.py "$@"
