#!/usr/bin/env bash
# Masa üyelerini Ozan gibi eğitmek · bilgisayarda tam koşu (11 Ekim 2026). Arşiv yoksa indirir (yalnız 2021-10'dan 15 dk + 1 g + fonlama + metrics),
# Ozan'ın değişkenlerini üretir (rank-ozellik.js), sonra tests/uye-lambdarank.py → tests/uye-lambdarank-report.md
set -e
export PYTHONUTF8=1
cd "$(dirname "$0")/.."
PY=${PY:-python}; A=tests/data/arch
[ -s "$A/universe.json" ] || node tests/fetch-archive.js --from 2021-10 --iv 15m --top 30 --top15 30 --conc 16
[ -d "$A/metrics" ] || node tests/fetch-metrics.js --top 30
ls $A/rank-*.f32 >/dev/null 2>&1 || { for p in 0 1 2 3; do node tests/rank-ozellik.js $p 4 > "$A/rank-$p.log" 2>&1 & done; wait; }
$PY tests/uye-lambdarank.py "$@"
