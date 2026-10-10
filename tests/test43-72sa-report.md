# Test #43 · 72 saat: Ozan alt onluk short, masa ve rastgele (arşiv)

10 Ekim 2026 · `python3 tests/test46-ozan-dok.py && node tests/test43-72sa.js`

Giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış 24 / 72 sa sonra o mumun VWAP'ı (taker + kayma) ya da stop. R birimi 2 × sd × giriş (bugünkü boy; felaket stopta ve stopsuzda kayıp 1R'yi aşabilir). Fonlama arşivden, basit getiri. Coin+yön başına tek açık işlem. Ozan kümeleri 2024-06-01 → (örneklem dışı tahminler), yarılar her kümenin kendi döneminde. "Haftalık t": haftanın işlemlerinin % toplamı (eşit boy), haftalar arası t; "en kötü hafta" aynı toplam.

| küme | ufuk · stop | işlem | R tümü | 1. yarı | 2. yarı | son 12 ay | % / işlem | en kötü işlem % | haftalık t | en kötü hafta % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ozan alt onluk short (masasız) | 24 sa · stop 2 × sd | 9.128 | +0,006 | +0,001 | +0,010 | +0,020 | -0,012 | -67,5 | -0,1 | -195,3 |
| Ozan alt onluk short (masasız) | 24 sa · felaket 4 × ATR(1 sa) | 7.235 | +0,007 | +0,007 | +0,007 | +0,013 | +0,036 | -108,2 | +0,2 | -216,0 |
| Ozan alt onluk short (masasız) | 24 sa · stopsuz | 6.508 | +0,007 | +0,011 | +0,002 | +0,023 | -0,001 | -562,2 | -0,0 | -472,3 |
| Ozan alt onluk short (masasız) | 72 sa · stop 2 × sd | 6.911 | +0,048 | +0,044 | +0,052 | +0,068 | +0,112 | -67,5 | +0,6 | -248,9 |
| Ozan alt onluk short (masasız) | 72 sa · felaket 4 × ATR(1 sa) | 4.942 | +0,041 | +0,042 | +0,041 | +0,055 | +0,108 | -62,3 | +0,4 | -345,3 |
| Ozan alt onluk short (masasız) | 72 sa · stopsuz | 3.814 | -0,023 | -0,003 | -0,045 | -0,027 | -0,195 | -1.275,7 | -0,3 | -1.234,5 |
| masa short ∧ Ozan alt onluk | 24 sa · stop 2 × sd | 1.167 | +0,051 | +0,043 | +0,061 | +0,072 | +0,145 | -7,3 | +0,7 | -62,5 |
| masa short ∧ Ozan alt onluk | 24 sa · felaket 4 × ATR(1 sa) | 1.113 | +0,017 | +0,024 | +0,008 | +0,020 | +0,041 | -18,5 | +0,2 | -74,8 |
| masa short ∧ Ozan alt onluk | 24 sa · stopsuz | 1.101 | -0,001 | +0,050 | -0,067 | -0,046 | -0,020 | -59,1 | -0,1 | -79,7 |
| masa short ∧ Ozan alt onluk | 72 sa · stop 2 × sd | 1.071 | +0,088 | +0,047 | +0,141 | +0,149 | +0,245 | -11,0 | +0,7 | -76,0 |
| masa short ∧ Ozan alt onluk | 72 sa · felaket 4 × ATR(1 sa) | 955 | +0,062 | +0,075 | +0,045 | +0,054 | +0,200 | -20,5 | +0,4 | -94,0 |
| masa short ∧ Ozan alt onluk | 72 sa · stopsuz | 885 | +0,072 | +0,082 | +0,059 | +0,057 | +0,158 | -120,4 | +0,2 | -145,6 |
| masa short (Ozan saatleri) | 24 sa · stop 2 × sd | 9.995 | -0,015 | +0,010 | -0,039 | -0,026 | -0,055 | -7,4 | -0,5 | -260,6 |
| masa short (Ozan saatleri) | 24 sa · felaket 4 × ATR(1 sa) | 8.908 | -0,003 | +0,010 | -0,014 | +0,006 | -0,021 | -29,2 | -0,2 | -265,1 |
| masa short (Ozan saatleri) | 24 sa · stopsuz | 8.727 | -0,017 | -0,017 | -0,018 | +0,009 | -0,061 | -94,2 | -0,4 | -246,7 |
| masa short (Ozan saatleri) | 72 sa · stop 2 × sd | 6.401 | +0,049 | +0,092 | +0,008 | +0,048 | +0,149 | -11,0 | +0,7 | -245,9 |
| masa short (Ozan saatleri) | 72 sa · felaket 4 × ATR(1 sa) | 5.002 | +0,057 | +0,085 | +0,031 | +0,094 | +0,187 | -29,2 | +0,6 | -315,2 |
| masa short (Ozan saatleri) | 72 sa · stopsuz | 4.335 | +0,119 | +0,073 | +0,162 | +0,241 | +0,384 | -86,8 | +0,9 | -316,7 |
| Ozan üst onluk long (masasız) | 24 sa · stop 2 × sd | 7.592 | -0,070 | -0,063 | -0,078 | -0,096 | -0,212 | -22,9 | -2,6 | -191,8 |
| Ozan üst onluk long (masasız) | 24 sa · felaket 4 × ATR(1 sa) | 6.926 | -0,072 | -0,073 | -0,072 | -0,096 | -0,211 | -43,0 | -2,2 | -181,8 |
| Ozan üst onluk long (masasız) | 24 sa · stopsuz | 6.419 | -0,046 | -0,034 | -0,058 | -0,083 | -0,117 | -54,5 | -1,2 | -176,4 |
| Ozan üst onluk long (masasız) | 72 sa · stop 2 × sd | 5.699 | -0,121 | -0,058 | -0,191 | -0,216 | -0,403 | -24,4 | -2,6 | -225,3 |
| Ozan üst onluk long (masasız) | 72 sa · felaket 4 × ATR(1 sa) | 4.733 | -0,112 | -0,044 | -0,184 | -0,223 | -0,325 | -43,0 | -1,3 | -268,7 |
| Ozan üst onluk long (masasız) | 72 sa · stopsuz | 3.786 | -0,083 | +0,022 | -0,192 | -0,233 | -0,209 | -62,7 | -0,6 | -313,7 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 24 sa · stop 2 × sd | 1.718 | +0,059 | +0,007 | +0,115 | +0,106 | +0,211 | -5,6 | +1,0 | -70,3 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 24 sa · felaket 4 × ATR(1 sa) | 1.625 | +0,075 | +0,098 | +0,051 | +0,054 | +0,282 | -16,3 | +1,0 | -114,8 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 24 sa · stopsuz | 1.598 | +0,083 | +0,113 | +0,051 | +0,042 | +0,317 | -35,5 | +1,1 | -114,8 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 72 sa · stop 2 × sd | 1.412 | +0,192 | +0,037 | +0,356 | +0,029 | +0,881 | -5,7 | +0,9 | -98,1 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 72 sa · felaket 4 × ATR(1 sa) | 1.259 | +0,193 | +0,047 | +0,342 | +0,053 | +0,900 | -28,9 | +0,8 | -197,8 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) | 72 sa · stopsuz | 1.153 | +0,179 | +0,040 | +0,320 | -0,007 | +0,888 | -84,6 | +0,7 | -233,4 |
| masa long, 7 g yönünde (Ozan saatleri) | 24 sa · stop 2 × sd | 5.184 | -0,044 | -0,062 | -0,023 | -0,004 | -0,152 | -5,6 | -1,2 | -151,0 |
| masa long, 7 g yönünde (Ozan saatleri) | 24 sa · felaket 4 × ATR(1 sa) | 4.646 | -0,011 | -0,023 | +0,004 | +0,012 | -0,042 | -53,5 | -0,2 | -148,1 |
| masa long, 7 g yönünde (Ozan saatleri) | 24 sa · stopsuz | 4.584 | +0,008 | -0,007 | +0,026 | +0,047 | +0,034 | -46,3 | +0,2 | -173,0 |
| masa long, 7 g yönünde (Ozan saatleri) | 72 sa · stop 2 × sd | 3.472 | +0,058 | +0,018 | +0,106 | -0,010 | +0,271 | -5,6 | +0,6 | -170,7 |
| masa long, 7 g yönünde (Ozan saatleri) | 72 sa · felaket 4 × ATR(1 sa) | 2.743 | +0,102 | +0,032 | +0,180 | +0,046 | +0,450 | -53,5 | +0,8 | -185,9 |
| masa long, 7 g yönünde (Ozan saatleri) | 72 sa · stopsuz | 2.443 | +0,058 | -0,068 | +0,200 | +0,060 | +0,304 | -84,6 | +0,4 | -325,4 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 24 sa · stop 2 × sd | 63.722 | -0,058 | -0,057 | -0,059 | -0,059 | -0,186 | -67,5 | -8,5 | -375,4 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 24 sa · felaket 4 × ATR(1 sa) | 49.041 | -0,052 | -0,059 | -0,045 | -0,045 | -0,169 | -81,3 | -6,7 | -335,8 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 24 sa · stopsuz | 43.540 | -0,051 | -0,051 | -0,050 | -0,050 | -0,160 | -302,8 | -340,8 | -60,4 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 72 sa · stop 2 × sd | 34.096 | -0,049 | -0,063 | -0,034 | -0,049 | -0,138 | -53,5 | -2,4 | -451,8 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 72 sa · felaket 4 × ATR(1 sa) | 22.591 | -0,054 | -0,068 | -0,040 | -0,043 | -0,138 | -78,3 | -1,8 | -386,3 |
| rastgele (Ozan saatlerinde bütün toplantılar) | 72 sa · stopsuz | 16.224 | -0,050 | -0,051 | -0,050 | -0,050 | -0,160 | -1.058,5 | -109,7 | -28,8 |
| 2020+ · masa (bugünkü kural) | 24 sa · stop 2 × sd | 45.056 | -0,041 | -0,037 | -0,045 | -0,020 | -0,137 | -98,4 | -2,6 | -348,7 |
| 2020+ · masa (bugünkü kural) | 24 sa · felaket 4 × ATR(1 sa) | 40.304 | -0,034 | -0,035 | -0,034 | +0,008 | -0,111 | -98,4 | -1,7 | -502,1 |
| 2020+ · masa (bugünkü kural) | 24 sa · stopsuz | 39.602 | -0,035 | -0,039 | -0,031 | +0,013 | -0,107 | -98,2 | -1,5 | -651,4 |
| 2020+ · masa (bugünkü kural) | 72 sa · stop 2 × sd | 29.491 | +0,006 | -0,004 | +0,017 | +0,014 | +0,016 | -98,4 | +0,1 | -389,4 |
| 2020+ · masa (bugünkü kural) | 72 sa · felaket 4 × ATR(1 sa) | 22.863 | +0,018 | +0,002 | +0,034 | +0,052 | +0,067 | -98,4 | +0,4 | -625,0 |
| 2020+ · masa (bugünkü kural) | 72 sa · stopsuz | 19.857 | +0,070 | +0,078 | +0,061 | +0,147 | +0,233 | -98,3 | +1,3 | -737,1 |
| 2020+ · masa short | 24 sa · stop 2 × sd | 24.263 | -0,026 | -0,020 | -0,031 | -0,025 | -0,086 | -7,4 | -1,0 | -260,6 |
| 2020+ · masa short | 24 sa · felaket 4 × ATR(1 sa) | 21.894 | -0,028 | -0,031 | -0,026 | +0,007 | -0,096 | -29,2 | -0,9 | -421,6 |
| 2020+ · masa short | 24 sa · stopsuz | 21.485 | -0,041 | -0,039 | -0,042 | +0,011 | -0,131 | -94,2 | -1,1 | -563,7 |
| 2020+ · masa short | 72 sa · stop 2 × sd | 15.582 | +0,011 | -0,002 | +0,023 | +0,047 | +0,022 | -13,9 | +0,1 | -389,4 |
| 2020+ · masa short | 72 sa · felaket 4 × ATR(1 sa) | 12.300 | +0,005 | -0,015 | +0,023 | +0,079 | -0,002 | -29,2 | -0,0 | -472,4 |
| 2020+ · masa short | 72 sa · stopsuz | 10.727 | +0,014 | -0,033 | +0,059 | +0,221 | +0,034 | -86,8 | +0,1 | -746,1 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 24 sa · stop 2 × sd | 6.646 | +0,027 | +0,017 | +0,039 | +0,054 | +0,087 | -98,4 | +0,8 | -141,6 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 24 sa · felaket 4 × ATR(1 sa) | 6.082 | +0,069 | +0,061 | +0,078 | +0,059 | +0,241 | -98,4 | +1,7 | -128,5 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 24 sa · stopsuz | 5.999 | +0,074 | +0,055 | +0,097 | +0,048 | +0,262 | -98,2 | +1,6 | -288,2 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 72 sa · stop 2 × sd | 5.420 | +0,083 | +0,027 | +0,148 | -0,030 | +0,304 | -98,4 | +1,0 | -199,5 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 72 sa · felaket 4 × ATR(1 sa) | 4.494 | +0,148 | +0,111 | +0,190 | -0,037 | +0,558 | -98,4 | +1,3 | -522,1 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde | 72 sa · stopsuz | 4.079 | +0,236 | +0,224 | +0,250 | -0,055 | +0,830 | -98,2 | +1,6 | -397,8 |
| 2020+ · rastgele (bütün toplantılar) | 24 sa · stop 2 × sd | 173.523 | -0,059 | -0,057 | -0,062 | -0,059 | -0,189 | -93,4 | -14,7 | -662,6 |
| 2020+ · rastgele (bütün toplantılar) | 24 sa · felaket 4 × ATR(1 sa) | 132.468 | -0,058 | -0,062 | -0,054 | -0,046 | -0,181 | -98,4 | -12,0 | -529,5 |
| 2020+ · rastgele (bütün toplantılar) | 24 sa · stopsuz | 117.602 | -0,051 | -0,051 | -0,051 | -0,050 | -0,160 | -302,8 | -253,0 | -61,6 |
| 2020+ · rastgele (bütün toplantılar) | 72 sa · stop 2 × sd | 92.174 | -0,062 | -0,062 | -0,063 | -0,048 | -0,188 | -98,3 | -5,4 | -771,3 |
| 2020+ · rastgele (bütün toplantılar) | 72 sa · felaket 4 × ATR(1 sa) | 60.454 | -0,067 | -0,071 | -0,064 | -0,044 | -0,196 | -99,1 | -4,4 | -704,3 |
| 2020+ · rastgele (bütün toplantılar) | 72 sa · stopsuz | 43.694 | -0,051 | -0,051 | -0,051 | -0,050 | -0,160 | -1.058,5 | -170,6 | -26,8 |

## Yıl yıl, 72 sa (R)

| küme · stop | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ozan alt onluk short (masasız) · stop 2 × sd | — | — | — | — | +0,054 | +0,061 | +0,027 |
| Ozan alt onluk short (masasız) · felaket 4 × ATR(1 sa) | — | — | — | — | +0,034 | +0,095 | -0,024 |
| Ozan alt onluk short (masasız) · stopsuz | — | — | — | — | -0,031 | -0,043 | +0,010 |
| masa short ∧ Ozan alt onluk · stop 2 × sd | — | — | — | — | +0,075 | +0,118 | +0,041 |
| masa short ∧ Ozan alt onluk · felaket 4 × ATR(1 sa) | — | — | — | — | -0,103 | +0,199 | -0,029 |
| masa short ∧ Ozan alt onluk · stopsuz | — | — | — | — | -0,054 | +0,277 | -0,193 |
| masa short (Ozan saatleri) · stop 2 × sd | — | — | — | — | +0,064 | +0,068 | +0,008 |
| masa short (Ozan saatleri) · felaket 4 × ATR(1 sa) | — | — | — | — | +0,072 | +0,072 | +0,024 |
| masa short (Ozan saatleri) · stopsuz | — | — | — | — | +0,014 | +0,174 | +0,115 |
| Ozan üst onluk long (masasız) · stop 2 × sd | — | — | — | — | -0,062 | -0,114 | -0,181 |
| Ozan üst onluk long (masasız) · felaket 4 × ATR(1 sa) | — | — | — | — | -0,080 | -0,102 | -0,151 |
| Ozan üst onluk long (masasız) · stopsuz | — | — | — | — | +0,020 | -0,127 | -0,109 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) · stop 2 × sd | — | — | — | — | +0,144 | +0,354 | +0,060 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) · felaket 4 × ATR(1 sa) | — | — | — | — | +0,209 | +0,269 | +0,102 |
| masa long #47 (BTC 24 sa ≤ 0, 7 g yönünde, Ozan en kötü onluk değil) · stopsuz | — | — | — | — | +0,263 | +0,270 | +0,025 |
| masa long, 7 g yönünde (Ozan saatleri) · stop 2 × sd | — | — | — | — | +0,019 | +0,087 | +0,060 |
| masa long, 7 g yönünde (Ozan saatleri) · felaket 4 × ATR(1 sa) | — | — | — | — | +0,059 | +0,120 | +0,118 |
| masa long, 7 g yönünde (Ozan saatleri) · stopsuz | — | — | — | — | -0,041 | +0,051 | +0,146 |
| rastgele (Ozan saatlerinde bütün toplantılar) · stop 2 × sd | — | — | — | — | -0,067 | -0,036 | -0,052 |
| rastgele (Ozan saatlerinde bütün toplantılar) · felaket 4 × ATR(1 sa) | — | — | — | — | -0,087 | -0,036 | -0,053 |
| rastgele (Ozan saatlerinde bütün toplantılar) · stopsuz | — | — | — | — | -0,051 | -0,050 | -0,050 |
| 2020+ · masa (bugünkü kural) · stop 2 × sd | -0,051 | +0,059 | +0,020 | -0,046 | -0,053 | +0,080 | +0,004 |
| 2020+ · masa (bugünkü kural) · felaket 4 × ATR(1 sa) | +0,000 | +0,043 | +0,042 | -0,013 | -0,071 | +0,086 | +0,039 |
| 2020+ · masa (bugünkü kural) · stopsuz | +0,068 | +0,230 | +0,078 | +0,003 | -0,108 | +0,135 | +0,090 |
| 2020+ · masa short · stop 2 × sd | -0,143 | -0,034 | +0,098 | -0,058 | -0,016 | +0,068 | +0,010 |
| 2020+ · masa short · felaket 4 × ATR(1 sa) | -0,153 | -0,137 | +0,149 | -0,073 | -0,022 | +0,072 | +0,025 |
| 2020+ · masa short · stopsuz | -0,214 | -0,163 | +0,254 | -0,239 | -0,093 | +0,175 | +0,116 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde · stop 2 × sd | +0,182 | +0,233 | -0,223 | -0,086 | +0,151 | +0,264 | +0,016 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde · felaket 4 × ATR(1 sa) | +0,354 | +0,391 | -0,353 | +0,097 | +0,130 | +0,242 | -0,009 |
| 2020+ · masa long, BTC 24 sa ≤ 0 + 7 g yönünde · stopsuz | +0,510 | +0,722 | -0,661 | +0,303 | +0,160 | +0,226 | -0,042 |
| 2020+ · rastgele (bütün toplantılar) · stop 2 × sd | -0,085 | -0,055 | -0,061 | -0,072 | -0,083 | -0,036 | -0,052 |
| 2020+ · rastgele (bütün toplantılar) · felaket 4 × ATR(1 sa) | -0,091 | -0,072 | -0,071 | -0,068 | -0,090 | -0,033 | -0,054 |
| 2020+ · rastgele (bütün toplantılar) · stopsuz | -0,051 | -0,049 | -0,051 | -0,052 | -0,051 | -0,051 | -0,050 |
