#!/usr/bin/env bash
# Ozan işlem kalitesi · bilgisayarda tam koşu (arşiv gerekir: tests/data/arch). 10 Ekim 2026.
# 1) Masa toplantılarını düzeltilmiş simülatörle (zaman stopu açılıştan) yeniden üretir → tests/data/arch/ok/samples-*.jsonl (4 çekirdek, ~1,5 sa)
# 2) Ozan'ın değişkenleri (rank-*.f32) ve Denklem 4 değişkenleri (denklem4.f32; OI, emir defteri, mikro yapı) ile birleştirir
# 3) İleri yürüyen LightGBM: aileler tek tek ve birlikte, hedef R ve y → tests/data/arch/ok/rapor-*.md
# Kullanım: bash tests/ozan-kalite-pc.sh [dış veri klasörü=tests/data/dis-veri]   (PY=python3 ile Python seçilebilir)
set -e
cd "$(dirname "$0")/.."
PY=${PY:-python}; XD=${1:-tests/data/dis-veri}; A=tests/data/arch; O=$A/ok; mkdir -p "$O"
if [ ! -s "$O/samples-3.jsonl" ] || [ "${YENI:-0}" = 1 ]; then
  for p in 0 1 2 3; do node tests/masa-archive.js $p 4 --out "$O" > "$O/masa-$p.log" 2>&1 & done; wait
fi
ls $A/rank-*.f32 >/dev/null 2>&1 || { for p in 0 1 2 3; do node tests/rank-ozellik.js $p 4 > "$O/rank-$p.log" 2>&1 & done; wait; }
$PY tests/ozan-kalite-veri.py "$O" "$XD" "$O/veri.pkl" --arch "$A"
for T in R y g24 g72 g72x; do
  $PY tests/ozan-kalite-model.py "$O/veri.pkl" "$O/rapor-$T.md" --target $T --lgb --sets B,B+O,B+D,B+O+D,B+XS+H+M,HEPSI,HEPSI-B --jobs 2
done
echo bitti: "$O"/rapor-*.md
