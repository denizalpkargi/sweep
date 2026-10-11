# İki aday için derin test · Data Trader Stoch + RSI + MACD ve Ichimoku

11 Ekim 2026. Aynı simülatör (`tests/sm-lib.js`): sinyal kapanışta, giriş sonraki açılışta, taker %0,05 + kayma %0,03 her tarafta, gerçek fonlama, aynı mumda stop + hedef → stop; **rastgele** = aynı coin ve yönde ±30 gün içinde aynı stop/hedef uzaklığı ve tutuşla 3 giriş, **fark** = R − rastgele. Yarılar 2023-05-15'te, son 12 ay 2025-10-11'den. Geniş evren: her ayın başında önceki 30 günün nominal hacmine göre ilk 50 COIN perp'i (TradFi yok), Binance'in bugün listede tuttuğu 670 sembol + elle eklenen delist coinler (MATIC, LUNA, SRM, FTM, OCEAN, WAVES …); sinyal yalnız coin o ay evrendeyse alınır. Evrene giren 425 coin.

| Grup | Strateji | Zaman | İşlem | Kazanma | Ort. R | t | 1. yarı | 2. yarı | Son 12 ay | Rastgele | Fark | Fark 1. yarı | Fark 2. yarı | Fark t | Artı coin payı | Long R | Short R |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. Taban (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD | 4h | 640 | 46 % | **0,122** | 2,7 | 0,177 | 0,076 | 0,019 | -0,018 | 0,141 | 0,188 | 0,100 | 2,9 | 75 % (20) | 0,064 | 0,167 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Data Trader Stoch + RSI + MACD | 4h | 1775 | 43 % | **0,045** | 1,6 | 0,050 | 0,042 | -0,016 | -0,011 | 0,056 | 0,048 | 0,062 | 2,0 | 54 % (114) | 0,024 | 0,072 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Data Trader Stoch + RSI + MACD · ana 20 dışı | 4h | 1222 | 41 % | **0,021** | 0,9 | -0,016 | 0,047 | -0,036 | -0,020 | 0,041 | 0,013 | 0,061 | 1,6 | 52 % (94) | 0,020 | 0,023 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 2h | 1506 | 42 % | **0,017** | 0,8 | 0,094 | -0,048 | -0,198 | -0,059 | 0,075 | 0,149 | 0,014 | 2,1 | 65 % (20) | -0,006 | 0,032 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 6h | 470 | 54 % | **0,335** | 3,9 | 0,280 | 0,380 | 0,122 | -0,090 | 0,426 | 0,329 | 0,504 | 4,1 | 100 % (20) | 0,368 | 0,308 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 8h | 363 | 40 % | **-0,009** | 0,9 | 0,081 | -0,081 | -0,215 | -0,092 | 0,082 | 0,118 | 0,054 | 1,8 | 35 % (20) | -0,016 | -0,004 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 12h | 277 | 45 % | **0,101** | 0,8 | 0,077 | 0,122 | -0,037 | 0,044 | 0,057 | 0,091 | 0,025 | 0,8 | 58 % (19) | 0,151 | 0,043 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 1d | 125 | 52 % | **0,292** | 1,0 | 0,205 | 0,356 | 0,618 | 0,050 | 0,242 | 0,222 | 0,257 | 0,9 | 65 % (17) | 0,486 | 0,069 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · maliyet ×2 | 4h | 640 | 46 % | **0,090** | 2,2 | 0,151 | 0,039 | -0,018 | -0,050 | 0,141 | 0,188 | 0,100 | 2,9 | 60 % (20) | 0,033 | 0,133 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · bir mum geç giriş | 4h | 640 | 46 % | **0,107** | 2,3 | 0,198 | 0,030 | 0,026 | -0,010 | 0,116 | 0,211 | 0,036 | 2,5 | 60 % (20) | 0,065 | 0,138 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · yalnız long | 4h | 289 | 45 % | **0,075** | 1,1 | 0,118 | 0,049 | 0,053 | -0,049 | 0,124 | 0,174 | 0,095 | 1,4 | 53 % (19) | 0,075 | – |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · yalnız short | 4h | 379 | 46 % | **0,138** | 2,2 | 0,197 | 0,078 | -0,041 | 0,029 | 0,109 | 0,158 | 0,058 | 2,1 | 65 % (20) | – | 0,138 |
| 1. Taban (ana 20, 4 sa) | Ichimoku | 4h | 4207 | 35 % | **0,086** | 4,1 | 0,100 | 0,074 | 0,017 | 0,016 | 0,071 | 0,062 | 0,078 | 3,7 | 100 % (20) | 0,087 | 0,085 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Ichimoku | 4h | 10245 | 35 % | **0,076** | 3,7 | 0,095 | 0,061 | 0,066 | 0,009 | 0,067 | 0,079 | 0,057 | 3,3 | 63 % (267) | 0,059 | 0,090 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Ichimoku · ana 20 dışı | 4h | 6588 | 35 % | **0,073** | 4,0 | 0,099 | 0,053 | 0,093 | 0,012 | 0,061 | 0,089 | 0,039 | 3,5 | 61 % (247) | 0,047 | 0,093 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 2h | 8872 | 33 % | **0,033** | 2,8 | 0,083 | -0,010 | -0,051 | -0,030 | 0,064 | 0,100 | 0,032 | 4,6 | 70 % (20) | 0,044 | 0,023 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 6h | 2872 | 35 % | **0,101** | 4,0 | 0,114 | 0,090 | -0,058 | 0,027 | 0,074 | 0,080 | 0,069 | 3,3 | 95 % (20) | 0,109 | 0,093 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 8h | 2135 | 38 % | **0,129** | 4,6 | 0,191 | 0,081 | 0,003 | 0,052 | 0,077 | 0,143 | 0,026 | 3,2 | 85 % (20) | 0,131 | 0,126 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 12h | 1397 | 37 % | **0,089** | 3,1 | 0,098 | 0,082 | 0,062 | 0,072 | 0,016 | 0,011 | 0,021 | 1,3 | 80 % (20) | 0,092 | 0,086 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 1d | 688 | 34 % | **0,085** | 1,9 | 0,149 | 0,038 | 0,016 | 0,144 | -0,059 | -0,000 | -0,102 | -0,8 | 65 % (20) | 0,227 | -0,029 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · maliyet ×2 | 4h | 4207 | 34 % | **0,057** | 3,0 | 0,076 | 0,040 | -0,020 | -0,014 | 0,071 | 0,062 | 0,078 | 3,7 | 85 % (20) | 0,057 | 0,057 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · bir mum geç giriş | 4h | 4240 | 35 % | **0,057** | 3,0 | 0,073 | 0,043 | -0,026 | 0,010 | 0,047 | 0,059 | 0,036 | 2,6 | 85 % (20) | 0,049 | 0,064 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · yalnız long | 4h | 2028 | 35 % | **0,085** | 1,1 | 0,092 | 0,080 | -0,029 | 0,033 | 0,052 | 0,049 | 0,056 | 0,7 | 85 % (20) | 0,085 | – |
| 4. Stres (ana 20, 4 sa) | Ichimoku · yalnız short | 4h | 2223 | 35 % | **0,088** | 1,4 | 0,099 | 0,079 | 0,058 | -0,011 | 0,100 | 0,096 | 0,102 | 2,2 | 95 % (20) | – | 0,088 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 10/90 | 4h | 26 | 54 % | **0,327** | 0,8 | 0,260 | 0,357 | 0,397 | 0,044 | 0,283 | 0,040 | 0,391 | 0,9 | – (0) | 0,627 | 0,169 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 15/85 | 4h | 188 | 44 % | **0,081** | 0,7 | 0,013 | 0,144 | 0,045 | -0,068 | 0,149 | 0,073 | 0,219 | 1,7 | 56 % (18) | 0,074 | 0,086 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 25/75 | 4h | 1462 | 45 % | **0,103** | 2,6 | 0,086 | 0,118 | 0,066 | -0,033 | 0,136 | 0,118 | 0,152 | 3,5 | 70 % (20) | 0,115 | 0,093 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 30/70 | 4h | 2289 | 44 % | **0,069** | 2,3 | 0,044 | 0,092 | 0,075 | -0,029 | 0,098 | 0,077 | 0,117 | 3,0 | 85 % (20) | 0,111 | 0,036 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · RSI 45 | 4h | 1180 | 43 % | **0,033** | 1,4 | 0,098 | -0,019 | -0,070 | -0,049 | 0,083 | 0,115 | 0,057 | 2,7 | 60 % (20) | 0,043 | 0,026 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · RSI 55 | 4h | 309 | 48 % | **0,159** | 3,0 | 0,301 | 0,045 | 0,131 | 0,101 | 0,058 | 0,130 | 0,000 | 2,3 | 75 % (20) | 0,094 | 0,216 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch penceresi 1 mum | 4h | 8 | 63 % | **0,528** | 1,2 | 0,198 | 1,520 | 1,455 | -0,057 | 0,586 | 0,145 | 1,907 | 1,3 | – (0) | 0,413 | 0,721 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch penceresi 5 mum | 4h | 1855 | 44 % | **0,070** | 2,0 | 0,088 | 0,054 | 0,026 | -0,024 | 0,093 | 0,078 | 0,106 | 2,6 | 55 % (20) | 0,054 | 0,080 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 7/22/44 | 4h | 5025 | 35 % | **0,070** | 3,3 | 0,093 | 0,049 | -0,011 | -0,010 | 0,080 | 0,109 | 0,054 | 3,9 | 85 % (20) | 0,085 | 0,057 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 10/30/60 | 4h | 3738 | 35 % | **0,104** | 4,4 | 0,124 | 0,087 | 0,029 | 0,017 | 0,087 | 0,096 | 0,080 | 4,0 | 95 % (20) | 0,083 | 0,122 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 20/60/120 | 4h | 1883 | 38 % | **0,127** | 4,8 | 0,135 | 0,121 | -0,006 | 0,061 | 0,066 | 0,060 | 0,072 | 2,6 | 95 % (20) | 0,129 | 0,126 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · Chikou şartı yok | 4h | 5279 | 34 % | **0,079** | 4,0 | 0,106 | 0,056 | -0,025 | 0,008 | 0,072 | 0,100 | 0,047 | 3,8 | 95 % (20) | 0,073 | 0,085 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 1 | 4h | 660 | 40 % | **-0,077** | -1,8 | -0,071 | -0,082 | -0,124 | -0,130 | 0,053 | -0,002 | 0,098 | 0,4 | 40 % (20) | -0,156 | -0,019 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 2 | 4h | 638 | 38 % | **-0,162** | -2,7 | -0,139 | -0,181 | -0,224 | -0,126 | -0,030 | -0,081 | 0,014 | -0,8 | 20 % (20) | -0,163 | -0,161 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 3 | 4h | 667 | 37 % | **-0,182** | -2,1 | -0,202 | -0,165 | -0,138 | -0,186 | 0,010 | -0,033 | 0,047 | 1,2 | 20 % (20) | -0,199 | -0,169 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 1 | 4h | 1870 | 39 % | **-0,091** | -3,3 | -0,085 | -0,097 | -0,106 | -0,108 | 0,016 | -0,007 | 0,034 | 0,2 | 45 % (115) | -0,093 | -0,089 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 2 | 4h | 1825 | 38 % | **-0,132** | -4,4 | -0,143 | -0,124 | -0,072 | -0,133 | 0,001 | -0,022 | 0,019 | -0,6 | 32 % (111) | -0,123 | -0,143 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 3 | 4h | 1830 | 36 % | **-0,182** | -5,7 | -0,124 | -0,224 | -0,161 | -0,127 | -0,052 | 0,001 | -0,092 | -1,7 | 31 % (106) | -0,202 | -0,156 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 1 | 4h | 3950 | 33 % | **-0,090** | -4,1 | -0,069 | -0,109 | -0,175 | -0,089 | -0,002 | 0,001 | -0,004 | 0,4 | 5 % (20) | -0,097 | -0,085 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 2 | 4h | 3955 | 33 % | **-0,078** | -3,2 | -0,066 | -0,089 | -0,149 | -0,097 | 0,020 | 0,023 | 0,018 | 2,0 | 5 % (20) | -0,078 | -0,078 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 3 | 4h | 3941 | 32 % | **-0,106** | -4,8 | -0,090 | -0,120 | -0,156 | -0,079 | -0,025 | -0,032 | -0,018 | -0,9 | 10 % (20) | -0,096 | -0,114 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 1 | 4h | 9691 | 33 % | **-0,075** | -5,0 | -0,059 | -0,089 | -0,112 | -0,073 | -0,001 | 0,011 | -0,010 | 0,7 | 31 % (267) | -0,105 | -0,050 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 2 | 4h | 9700 | 33 % | **-0,059** | -4,5 | -0,047 | -0,069 | -0,112 | -0,074 | 0,017 | 0,023 | 0,011 | 1,9 | 38 % (269) | -0,086 | -0,036 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 3 | 4h | 9629 | 33 % | **-0,091** | -6,7 | -0,068 | -0,111 | -0,106 | -0,076 | -0,013 | 0,006 | -0,028 | -0,7 | 33 % (261) | -0,131 | -0,059 |

## Yıl yıl ortalama R

| Grup | Strateji | Zaman | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|
| 1. Taban (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD | 4h | 0,33 | 0,38 | -0,01 | -0,15 | 0,01 | 0,22 | 0,04 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Data Trader Stoch + RSI + MACD | 4h | 0,08 | 0,13 | 0,07 | -0,11 | -0,06 | 0,12 | 0,06 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Data Trader Stoch + RSI + MACD · ana 20 dışı | 4h | -0,03 | -0,03 | 0,11 | -0,05 | -0,06 | 0,09 | 0,06 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 2h | 0,26 | 0,02 | 0,06 | -0,10 | 0,07 | -0,05 | -0,14 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 6h | 0,31 | 0,30 | 0,41 | 0,39 | 0,30 | 0,46 | 0,18 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 8h | 0,12 | -0,04 | -0,00 | 0,37 | -0,20 | -0,05 | -0,18 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 12h | -0,06 | 0,03 | 0,11 | 0,15 | 0,42 | 0,13 | -0,09 |
| 3. Zaman dilimi (ana 20) | Data Trader Stoch + RSI + MACD | 1d | -0,41 | 0,31 | 0,32 | 1,49 | 0,16 | -0,04 | 0,66 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · maliyet ×2 | 4h | 0,30 | 0,36 | -0,04 | -0,20 | -0,03 | 0,19 | 0,00 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · bir mum geç giriş | 4h | 0,37 | 0,47 | -0,06 | -0,24 | -0,03 | 0,16 | 0,03 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · yalnız long | 4h | 0,66 | 0,40 | -0,35 | -0,13 | -0,01 | 0,02 | 0,08 |
| 4. Stres (ana 20, 4 sa) | Data Trader Stoch + RSI + MACD · yalnız short | 4h | 0,22 | 0,34 | 0,14 | -0,15 | 0,04 | 0,28 | -0,02 |
| 1. Taban (ana 20, 4 sa) | Ichimoku | 4h | 0,13 | 0,09 | 0,13 | 0,04 | 0,13 | 0,09 | 0,01 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Ichimoku | 4h | 0,08 | 0,06 | 0,17 | 0,02 | 0,09 | 0,07 | 0,06 |
| 2. Geniş evren (ayın ilk 50'ü, delist dahil) | Ichimoku · ana 20 dışı | 4h | 0,06 | 0,05 | 0,18 | 0,01 | 0,08 | 0,06 | 0,09 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 2h | 0,14 | 0,12 | 0,05 | 0,01 | 0,03 | -0,05 | -0,04 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 6h | 0,10 | 0,16 | 0,15 | 0,03 | 0,28 | 0,02 | -0,03 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 8h | 0,22 | 0,16 | 0,23 | 0,08 | 0,22 | -0,00 | 0,03 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 12h | 0,25 | 0,07 | 0,07 | 0,15 | 0,05 | 0,01 | 0,09 |
| 3. Zaman dilimi (ana 20) | Ichimoku | 1d | 0,09 | 0,33 | -0,02 | 0,06 | 0,12 | -0,08 | 0,11 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · maliyet ×2 | 4h | 0,11 | 0,07 | 0,11 | -0,00 | 0,10 | 0,06 | -0,03 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · bir mum geç giriş | 4h | 0,10 | 0,07 | 0,09 | 0,01 | 0,14 | 0,04 | -0,04 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · yalnız long | 4h | 0,14 | 0,17 | 0,03 | 0,04 | 0,13 | 0,08 | -0,01 |
| 4. Stres (ana 20, 4 sa) | Ichimoku · yalnız short | 4h | 0,12 | -0,01 | 0,19 | 0,03 | 0,15 | 0,11 | 0,03 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 10/90 | 4h | 0,26 | – | – | 0,22 | 0,23 | 0,46 | 0,40 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 15/85 | 4h | 0,17 | -0,00 | 0,22 | -0,41 | 0,18 | 0,26 | 0,10 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 25/75 | 4h | 0,05 | 0,26 | 0,04 | -0,06 | -0,04 | 0,31 | 0,08 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch 30/70 | 4h | 0,06 | 0,03 | 0,10 | -0,03 | 0,03 | 0,18 | 0,11 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · RSI 45 | 4h | 0,35 | 0,11 | 0,07 | -0,22 | -0,13 | 0,13 | -0,02 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · RSI 55 | 4h | 0,33 | 0,41 | 0,33 | -0,16 | -0,10 | 0,22 | 0,08 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch penceresi 1 mum | 4h | 0,67 | -0,27 | – | – | 1,58 | – | 1,45 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Data Trader · Stoch penceresi 5 mum | 4h | 0,06 | 0,08 | 0,28 | -0,11 | -0,12 | 0,20 | 0,06 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 7/22/44 | 4h | 0,14 | 0,14 | 0,07 | 0,01 | 0,09 | 0,08 | -0,02 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 10/30/60 | 4h | 0,17 | 0,08 | 0,18 | 0,05 | 0,20 | 0,05 | 0,04 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · 20/60/120 | 4h | 0,17 | 0,12 | 0,13 | 0,17 | 0,19 | 0,09 | 0,01 |
| 5. Gösterge komşuları (ana 20, 4 sa) | Ichimoku · Chikou şartı yok | 4h | 0,11 | 0,12 | 0,14 | 0,02 | 0,13 | 0,07 | -0,03 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 1 | 4h | -0,10 | -0,24 | 0,13 | -0,06 | 0,02 | -0,12 | -0,12 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 2 | 4h | -0,43 | 0,06 | -0,21 | -0,34 | -0,14 | -0,03 | -0,22 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · ana 20 · tohum 3 | 4h | -0,40 | 0,01 | -0,12 | -0,32 | -0,07 | -0,32 | -0,16 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 1 | 4h | -0,16 | -0,12 | 0,01 | -0,05 | -0,08 | -0,14 | -0,09 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 2 | 4h | -0,20 | -0,06 | -0,24 | -0,18 | -0,11 | -0,15 | -0,04 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Data Trader Stoch + RSI + MACD · geniş · tohum 3 | 4h | -0,26 | -0,06 | -0,03 | -0,18 | -0,25 | -0,32 | -0,14 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 1 | 4h | -0,08 | -0,07 | -0,06 | -0,11 | -0,05 | -0,11 | -0,16 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 2 | 4h | -0,08 | -0,06 | -0,07 | -0,10 | -0,02 | -0,08 | -0,14 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · ana 20 · tohum 3 | 4h | -0,12 | -0,06 | -0,11 | -0,11 | -0,08 | -0,12 | -0,17 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 1 | 4h | -0,07 | -0,08 | -0,03 | -0,11 | -0,05 | -0,08 | -0,10 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 2 | 4h | -0,06 | -0,07 | -0,03 | -0,06 | -0,01 | -0,08 | -0,11 |
| 6. Plasebo (aynı stop/hedef/çıkış kuralı, rastgele zaman) | Ichimoku · geniş · tohum 3 | 4h | -0,10 | -0,05 | -0,08 | -0,11 | -0,08 | -0,11 | -0,11 |

## Kayan 12 ay ortalama R (çeyrek sonları)

| Çeyrek sonu | Data Trader Stoch + RSI + MACD · ana 20 | Data Trader Stoch + RSI + MACD · geniş | Ichimoku · ana 20 | Ichimoku · geniş |
|---|---|---|---|---|
| 2021-03 | 0,31 (65) | 0,08 (188) | 0,10 (509) | 0,07 (1222) |
| 2021-06 | 0,32 (72) | 0,02 (205) | 0,11 (566) | 0,08 (1395) |
| 2021-09 | 0,38 (98) | 0,11 (257) | 0,09 (660) | 0,05 (1605) |
| 2021-12 | 0,38 (109) | 0,13 (272) | 0,09 (693) | 0,06 (1686) |
| 2022-03 | 0,25 (116) | 0,05 (294) | 0,10 (671) | 0,10 (1646) |
| 2022-06 | 0,21 (121) | 0,10 (293) | 0,17 (665) | 0,16 (1596) |
| 2022-09 | 0,06 (92) | 0,05 (238) | 0,11 (661) | 0,14 (1551) |
| 2022-12 | -0,02 (79) | 0,07 (218) | 0,13 (624) | 0,17 (1516) |
| 2023-03 | 0,06 (82) | 0,16 (220) | 0,08 (650) | 0,10 (1557) |
| 2023-06 | -0,21 (84) | -0,06 (238) | 0,00 (702) | 0,04 (1668) |
| 2023-09 | -0,19 (82) | -0,08 (234) | 0,04 (683) | 0,06 (1716) |
| 2023-12 | -0,15 (79) | -0,11 (252) | 0,04 (685) | 0,02 (1748) |
| 2024-03 | -0,01 (81) | -0,07 (256) | 0,03 (713) | 0,00 (1797) |
| 2024-06 | 0,22 (84) | 0,09 (250) | 0,04 (663) | 0,00 (1725) |
| 2024-09 | 0,10 (97) | 0,00 (259) | 0,09 (636) | 0,04 (1617) |
| 2024-12 | 0,01 (96) | -0,07 (240) | 0,13 (619) | 0,09 (1572) |
| 2025-03 | 0,02 (104) | -0,06 (264) | 0,17 (615) | 0,13 (1536) |
| 2025-06 | -0,04 (93) | -0,04 (256) | 0,19 (635) | 0,13 (1565) |
| 2025-09 | 0,18 (97) | 0,16 (302) | 0,16 (657) | 0,09 (1649) |
| 2025-12 | 0,22 (106) | 0,12 (338) | 0,09 (639) | 0,07 (1559) |
| 2026-03 | 0,06 (109) | 0,10 (340) | 0,05 (637) | 0,07 (1565) |
| 2026-06 | 0,13 (126) | 0,04 (381) | 0,04 (636) | 0,06 (1565) |
| 2026-09 | 0,05 (122) | -0,01 (372) | 0,00 (652) | 0,07 (1568) |

## Portföy (işlem başına özkaynağın %0,5'i risk, en çok 10 pozisyon, toplam nominal ≤ 2× özkaynak; gerçekleşen kâr/zararla)

| Strateji | Evren | Alınan / atlanan | Yıllık | En büyük düşüş | Sharpe (aylık) | En kötü ay |
|---|---|---|---|---|---|---|
| Data Trader Stoch + RSI + MACD (risk %0.5) | ana 20 | 499 / 141 | 5 % | -12 % | 0,77 | -6 % |
| Data Trader Stoch + RSI + MACD (risk %1) | ana 20 | 484 / 156 | 9 % | -23 % | 0,74 | -11 % |
| Data Trader Stoch + RSI + MACD (risk %0.5) | geniş | 473 / 1302 | 3 % | -8 % | 0,78 | -6 % |
| Data Trader Stoch + RSI + MACD (risk %1) | geniş | 471 / 1304 | 6 % | -15 % | 0,73 | -12 % |
| Data Trader Stoch + RSI + MACD · ana 20 dışı (risk %0.5) | geniş | 642 / 580 | 1 % | -18 % | 0,14 | -5 % |
| Data Trader Stoch + RSI + MACD · ana 20 dışı (risk %1) | geniş | 641 / 581 | 1 % | -34 % | 0,11 | -9 % |
| Ichimoku (risk %0.5) | ana 20 | 468 / 3739 | 6 % | -9 % | 2,06 | -7 % |
| Ichimoku (risk %1) | ana 20 | 505 / 3702 | 12 % | -17 % | 1,72 | -12 % |
| Ichimoku (risk %0.5) | geniş | 362 / 9883 | 2 % | -14 % | 0,97 | -9 % |
| Ichimoku (risk %1) | geniş | 384 / 9861 | 4 % | -29 % | 0,96 | -16 % |
| Ichimoku · ana 20 dışı (risk %0.5) | geniş | 284 / 6304 | 1 % | -12 % | 0,40 | -7 % |
| Ichimoku · ana 20 dışı (risk %1) | geniş | 374 / 6214 | -0 % | -27 % | 0,01 | -14 % |

İki adayın aylık ortalama R'si arasındaki korelasyon (ana 20, 4 sa): 0,18 (80 ay).

## Çoklu deneme

Sosyal medya taramasında ve bu testte toplam yaklaşık 167 ayar denendi. İlk süzgeçteki 88 ayarın "fark t"leri: en yüksek 5,6, 4,6, 4,3, 4,0, 3,8; medyan 0,8; t > 2 olan 25. Bonferroni ile %5 için gereken iki yönlü p < 4.2e-4 (t ≈ 3,5). Tabanın fark p'leri: Data Trader Stoch + RSI + MACD 3.8e-3 (t 2,9) · Ichimoku 2.6e-4 (t 3,7).

_25 sn · node tests/sm-aday.js_
