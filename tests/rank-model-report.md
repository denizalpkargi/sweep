# Sıralama modeli (Ozan) · canlı değişkenlerle lambdarank · 2026-10-09

1,240,774 satır, 41,780 saat (2022-01 → 2026-10), saat başına 29.7 coin (ayın ilk 30'u). Değişkenler src/rankmodel.js rkFeat (canlıyla aynı kod): 52 ham + 12 coinler arası dilim. Hedef Denklem 4 ile aynı (VWAP → VWAP, oynaklığa bölünmüş, saat içi onluk etiketi). Test 2024-06'dan 6 aylık pencereler, eğitim öncesi tüm veri (en çok 300,000 satır, rastgele), boşluk 2 gün; 200 ağaç, 31 yaprak.

## İleriye yürüyen IC (saat içi Spearman)

| Model | Ufuk | Tümü | t | 1. yarı | 2. yarı | Son 12 ay | Pencereler |
|---|---|---|---|---|---|---|---|
| tam | 4 sa | +0,059 | +35,0 | +0,062 | +0,057 | +0,055 | +0,061 / +0,055 / +0,070 / +0,059 / +0,048 |
| tam | 12 sa | +0,070 | +42,3 | +0,081 | +0,059 | +0,055 | +0,071 / +0,078 / +0,089 / +0,057 / +0,052 |

## Onluklar ve 2+2 işlem (ham getiri, %)

Her saat en yüksek 2 coin long, en düşük 2 short, ufuk boyunca tutulur; taker gidiş-dönüş %0,16 (bacak başına). Saatler örtüşür, ortalama işlem başına.

Getiri basit (e^r − 1; log getiri shortu oynaklık kadar fazla gösterir) ve fonlama dahil (o anki fonlama oranı × ufuk ÷ 8 sa; short pozitif fonlamada alır).

| Model | Ufuk | Alt onluk | Üst onluk | Üst−alt | Long bacak | Short bacak | 2+2 brüt | 2+2 taker sonrası | Son 12 ay taker sonrası | Alt onlukta long (taker sonrası) |
|---|---|---|---|---|---|---|---|---|---|---|
| tam | 4 sa | -0,090 | +0,023 | +0,113 | +0,021 | +0,096 | +0,059 | -0,101 | -0,094 | -0,250 |
| tam | 12 sa | -0,243 | +0,092 | +0,335 | +0,081 | +0,266 | +0,174 | +0,014 | -0,033 | -0,403 |

## Dışa aktarılan model
Dışa aktarılan 4 sa modelinde en çok kazanç sağlayan değişkenler: x_rv 9%, x_z4 4%, corr 4%, x_vwD24 3%, lq24 3%, rv 3%, ddHi90 3%, z90d 3%, x_z1 2%, gl 2%, oiTurn 2%, tp 2%
Dışa aktarılan 12 sa modelinde en çok kazanç sağlayan değişkenler: x_rv 9%, lq24 4%, tp 4%, corr 4%, z90d 4%, vq7 3%, tk9d 3%, gl 3%, oiTurn 3%, rvD 3%, rv 3%, rv4h 3%
Model dosyası src/rankmodel-data.js 482 KB (tam).
