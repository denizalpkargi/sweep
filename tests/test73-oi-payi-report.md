# Test #73 · Altcoin OI payı rejim süzgeci

13 Ekim 2026 · `node tests/test73-oi-payi.js` · pay: ayın ilk 30 coini (TradFi hariç) içinde BTC/ETH dışı açık pozisyon değeri payı, arşiv metrics, günlük 2021-12-02 → 2026-10-11. İşaret: dünkü pay önceki 365 günün üst %10'unda (2022-09-28'den). Önceden sabit kural: işaretli günde açılan altcoin longu yarı boy.

Pay ortalaması %27,8, en az %19,3, en çok %42,8; işaretli gün payı %8,0.

## Kaplumbağa 1 long + SMA200

| dönem | işaretli n | işaretli R | diğer n | diğer R | fark | t (fark) | tam boy ort. R | yarı boy ort. R |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| tümü | 49 | -0,502 | 494 | +0,383 | -0,885 | -1,8 | +0,304 | +0,326 |
| 1. yarı | 31 | -0,161 | 283 | +0,342 | -0,503 | -0,6 | +0,292 | +0,300 |
| 2. yarı | 18 | -1,090 | 211 | +0,439 | -1,529 | -4,6 | +0,319 | +0,362 |
| son 12 ay | 4 | +0,094 | 51 | +0,767 | -0,673 | -1,0 | +0,718 | +0,714 |

## Ichimoku long

| dönem | işaretli n | işaretli R | diğer n | diğer R | fark | t (fark) | tam boy ort. R | yarı boy ort. R |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| tümü | 164 | -0,049 | 1710 | +0,084 | -0,133 | -1,8 | +0,072 | +0,074 |
| 1. yarı | 122 | -0,029 | 880 | +0,073 | -0,103 | -1,1 | +0,061 | +0,063 |
| 2. yarı | 42 | -0,106 | 830 | +0,095 | -0,201 | -1,7 | +0,085 | +0,088 |
| son 12 ay | 17 | -0,225 | 397 | +0,051 | -0,276 | -1,4 | +0,040 | +0,044 |

## Sonuç

Geçme (işaretli longlar iki yarıda ve son 12 ayda daha kötü ve yarı boy ortalamayı artırıyor): Kaplumbağa 1 long + SMA200 geçmedi, Ichimoku long **geçti**. Yıllık pay serisi ve işaretli günler yalnız ilk 30 coinden (metrics kapsamı); tüm borsa OI'si değil.

## Eşik komşuları (sonuçtan sonra, sağlamlık için)

İşaretli dönem sayısı (ardışık gün kümeleri): %80 → 26, %90 → 16, %95 → 15.

| eşik | Kaplumbağa fark 1. yarı / 2. yarı / son 12 ay | Ichimoku fark 1. yarı / 2. yarı / son 12 ay | geçme |
|---|---|---|---|
| %80 | +0,314 / −1,402 / −0,799 | +0,007 / −0,166 / −0,104 | ikisi de geçmedi |
| %90 | −0,503 / −1,529 / −0,673 | −0,103 / −0,201 / −0,276 | Ichimoku |
| %95 | −0,373 / −1,754 / – (0 işlem) | −0,333 / −0,116 / −0,223 | Ichimoku |

Yön çoğunlukla aynı (kalabalık altcoin günlerinde açılan longlar kötü) ama %80'de ilk yarıda işaret dönüyor, en iyi t −2,8, kanıt 15–26 dönemden ve yarı boyun ortalama R'ye katkısı +0,002…+0,04R. Kanıt değil; izlemede.
