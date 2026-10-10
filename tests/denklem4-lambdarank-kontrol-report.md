# Lambdarank kontrolü · test 2025-06 → 2025-11 · 2026-10-09

Eğitim 300,000 satır (testten 2 gün önce biter), test 130,638. Plasebo = saat içinde karıştırılmış etiket; piyasa düzeyi = yalnız saat içinde sabit 36 değişken (sıralama bilgisi taşıyamaz). IC (oynaklığa bölünmüş) eğitim hedefiyle aynı ölçü; IC (%) ham yüzde getiriyle. 2+2: saat başı en yüksek 2 long + en düşük 2 short, ufuk boyunca tut, her saat yeni kohort (örtüşen), işlem başı ortalama %.

| Ufuk | Model | IC (oynaklığa bölünmüş) | t | IC (ham %) | Üst onluk % | Alt onluk % | Üst−alt % | 2+2 long % | 2+2 short % | 2+2 ort. maliyetsiz % | taker sonrası % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 4 sa | lambdarank, gerçek etiket | +0,067 | +17,0 | +0,079 | -0,001 | -0,171 | +0,170 | +0,007 | +0,221 | +0,114 | -0,046 |
| 4 sa | lambdarank, plasebo etiket | -0,003 | -1,0 | -0,001 | -0,090 | -0,080 | -0,009 | -0,096 | +0,085 | -0,005 | -0,165 |
| 4 sa | lambdarank, yalnız piyasa düzeyi | — | — | — | -0,091 | -0,098 | +0,006 | -0,077 | +0,102 | +0,013 | -0,147 |
| 4 sa | LightGBM arındırılmış MSE (karşılaştırma) | +0,034 | +9,6 | +0,046 | -0,020 | -0,188 | +0,168 | -0,016 | +0,197 | +0,090 | -0,070 |
| 12 sa | lambdarank, gerçek etiket | +0,087 | +21,3 | +0,102 | -0,046 | -0,722 | +0,676 | -0,067 | +0,733 | +0,333 | +0,173 |
| 12 sa | lambdarank, plasebo etiket | -0,027 | -7,0 | -0,048 | -0,352 | -0,156 | -0,196 | -0,355 | +0,152 | -0,101 | -0,261 |
| 12 sa | lambdarank, yalnız piyasa düzeyi | — | — | — | -0,282 | -0,300 | +0,018 | -0,235 | +0,313 | +0,039 | -0,121 |
| 12 sa | LightGBM arındırılmış MSE (karşılaştırma) | +0,057 | +15,6 | +0,080 | -0,083 | -0,625 | +0,542 | -0,194 | +0,610 | +0,208 | +0,048 |

Okuma: plasebo ve yalnız piyasa düzeyi satırlarının IC'si ≈ 0 olmalı; değilse ölçümde/etikette sızıntı var. Gerçek etiketli lambdarank IC'si ham % getiride de korunuyorsa sonuç oynaklık normalleştirmesinin yapay ürünü değildir.
