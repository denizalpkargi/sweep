# Ozan · Kaggle fikirleri (test listesi #37) · 2026-10-09

Veri ve bölünmeler tests/rank-model.py ile aynı (src/rankmodel.js değişkenleri, 2024-06'dan 6 aylık 5 pencere, 2 gün boşluk, 300 bin satır, 200 ağaç). bdm = BTC'ye göre arındırılmış hedefle eğitim (coin − β·BTC), tw = zaman ağırlığı (yarı ömür 12 ay), fsel = kazançta ilk 30 değişken. IC her satırda aynı hedefte (oynaklığa bölünmüş VWAP getirisi); son sütun arındırılmış hedefte.

| Ufuk | Varyant | IC tümü | 1. yarı | 2. yarı | Son 12 ay | Pencereler | IC (arındırılmış hedef) |
|---|---|---|---|---|---|---|---|
| 4 sa | taban | +0,059 | +0,062 | +0,057 | +0,055 | +0,061 / +0,055 / +0,070 / +0,059 / +0,048 | +0,058 |
| 4 sa | bdm | +0,059 | +0,061 | +0,056 | +0,055 | +0,059 / +0,057 / +0,068 / +0,058 / +0,050 | +0,058 |
| 4 sa | tw | +0,060 | +0,067 | +0,053 | +0,050 | +0,063 / +0,061 / +0,072 / +0,054 / +0,045 | +0,058 |
| 4 sa | fsel | +0,056 | +0,059 | +0,053 | +0,051 | +0,056 / +0,054 / +0,067 / +0,053 / +0,045 | +0,054 |
| 4 sa | bdm+tw | +0,059 | +0,062 | +0,056 | +0,054 | +0,061 / +0,055 / +0,070 / +0,057 / +0,050 | +0,059 |
| 12 sa | taban | +0,070 | +0,081 | +0,059 | +0,055 | +0,071 / +0,078 / +0,089 / +0,057 / +0,052 | +0,069 |
| 12 sa | bdm | +0,067 | +0,078 | +0,057 | +0,054 | +0,066 / +0,077 / +0,087 / +0,055 / +0,047 | +0,067 |
| 12 sa | tw | +0,071 | +0,084 | +0,058 | +0,054 | +0,073 / +0,081 / +0,090 / +0,061 / +0,043 | +0,070 |
| 12 sa | fsel | +0,067 | +0,079 | +0,056 | +0,053 | +0,065 / +0,080 / +0,084 / +0,055 / +0,047 | +0,066 |
| 12 sa | bdm+tw | +0,070 | +0,081 | +0,059 | +0,056 | +0,072 / +0,076 / +0,088 / +0,063 / +0,040 | +0,069 |

4 sa değişken seçiminde 5 pencerenin hepsinde seçilenler: corr, dS100, ddHi90, gl, jump, lq24, oiTurn, rel4, rv, rvD, tk9d, tp, vq7, vqD, x_fr, x_lq24, x_rv, x_vwD24, x_z1, x_z4, x_z9d, z90d

12 sa değişken seçiminde 5 pencerenin hepsinde seçilenler: beta, corr, dS100, dS20, dS50, ddHi90, gl, lq24, oiTurn, rv, rv4h, rvD, tk9d, tp, vq7, vqD, x_fr, x_rv, x_z30d, x_z9d, z14d, z30d, z90d, z9d
