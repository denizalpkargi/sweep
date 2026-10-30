# Test #59 · BTC öncülüğü, maker limit giriş, dürüst dolum (arşiv)

11 Ekim 2026 gecesi · `node tests/test59-btc-onculuk-limit.js` · 8605 sinyal, 2020-02-03 → 2026-10-07

Sinyal #55 E1. Limit sinyal mumunun kapanışından x kadar iyi, yalnız sonraki 15 dk; dolum fiyatın limiti %0,05 geçmesiyle. Çıkış ufuk sonu mum VWAP, taker. Net %: maker+taker+kayma %0,10 (taker giriş %0,16) ve fonlama. t gün kümeli.

| Giriş | Yön | Ufuk | n | Dolum % | Net % (t) | 1. yarı / 2. yarı / son 12 ay | Dolmayanların taker neti % | Geçti |
|---|---|---|---:|---:|---|---|---:|---|
| taker (sonraki mum VWAP) | her iki | 1 sa | 8602 | 100 | -0,130 (-1,5) | -0,170 / +0,020 / -0,130 | – | hayır |
| limit kapanış | her iki | 1 sa | 7920 | 92 | -0,198 (-1,2) | -0,257 / +0,011 / -0,141 | +0,097 | hayır |
| limit kapanış −%0,1 | her iki | 1 sa | 7126 | 83 | -0,205 (-0,7) | -0,260 / -0,020 / -0,115 | +0,085 | hayır |
| limit kapanış −%0,2 | her iki | 1 sa | 6404 | 74 | -0,198 (-0,5) | -0,258 / -0,004 / -0,172 | +0,073 | hayır |
| taker (sonraki mum VWAP) | her iki | 4 sa | 8604 | 100 | -0,207 (-0,6) | -0,211 / -0,191 / -0,326 | – | hayır |
| limit kapanış | her iki | 4 sa | 7922 | 92 | -0,276 (-0,5) | -0,299 / -0,197 / -0,313 | +0,070 | hayır |
| limit kapanış −%0,1 | her iki | 4 sa | 7127 | 83 | -0,307 (-0,2) | -0,330 / -0,229 / -0,293 | +0,141 | hayır |
| limit kapanış −%0,2 | her iki | 4 sa | 6405 | 74 | -0,307 (-0,0) | -0,331 / -0,225 / -0,328 | +0,097 | hayır |
| taker (sonraki mum VWAP) | long | 1 sa | 5806 | 100 | +0,009 (-1,9) | -0,025 / +0,170 / -0,082 | – | hayır |
| limit kapanış | long | 1 sa | 5263 | 91 | -0,003 (-1,0) | -0,029 / +0,111 / -0,028 | +0,121 | hayır |
| limit kapanış −%0,1 | long | 1 sa | 4645 | 80 | +0,007 (-0,7) | -0,027 / +0,150 / +0,003 | +0,098 | hayır |
| limit kapanış −%0,2 | long | 1 sa | 4091 | 70 | +0,030 (-0,5) | -0,005 / +0,174 / -0,094 | +0,085 | hayır |
| taker (sonraki mum VWAP) | long | 4 sa | 5805 | 100 | +0,109 (-0,5) | +0,072 / +0,285 / -0,057 | – | hayır |
| limit kapanış | long | 4 sa | 5262 | 91 | +0,092 (-0,1) | +0,062 / +0,225 / -0,015 | +0,273 | hayır |
| limit kapanış −%0,1 | long | 4 sa | 4644 | 80 | +0,086 (-0,0) | +0,048 / +0,249 / -0,029 | +0,286 | hayır |
| limit kapanış −%0,2 | long | 4 sa | 4090 | 70 | +0,117 (+0,0) | +0,082 / +0,262 / -0,120 | +0,220 | hayır |
| taker (sonraki mum VWAP) | short | 1 sa | 2796 | 100 | -0,417 (-1,5) | -0,520 / -0,166 / -0,177 | – | hayır |
| limit kapanış | short | 1 sa | 2657 | 95 | -0,584 (-2,0) | -0,782 / -0,112 / -0,255 | +0,003 | hayır |
| limit kapanış −%0,1 | short | 1 sa | 2481 | 89 | -0,603 (-1,4) | -0,765 / -0,223 / -0,231 | +0,037 | hayır |
| limit kapanış −%0,2 | short | 1 sa | 2313 | 83 | -0,603 (-1,3) | -0,769 / -0,213 / -0,247 | +0,031 | hayır |
| taker (sonraki mum VWAP) | short | 4 sa | 2799 | 100 | -0,861 (-1,6) | -0,895 / -0,779 / -0,596 | – | hayır |
| limit kapanış | short | 4 sa | 2660 | 95 | -1,005 (-1,2) | -1,126 / -0,718 / -0,613 | -0,721 | hayır |
| limit kapanış −%0,1 | short | 4 sa | 2483 | 89 | -1,042 (-0,6) | -1,146 / -0,798 / -0,551 | -0,393 | hayır |
| limit kapanış −%0,2 | short | 4 sa | 2315 | 83 | -1,056 (-0,5) | -1,166 / -0,795 / -0,527 | -0,339 | hayır |

## Geçenler

- Geçen yok.
