# Test #52 · masa short + 72 sa + Ozan işlem kalitesi süzgeci (arşiv)

11 Ekim 2026 · `python3 tests/test52-kalite-tahmin.py <ok> && node tests/test52-ozan-kalite-72sa.js`

Süzgeç: Ozan işlem kalitesi modeli (hedef g72x, LightGBM, ileri yürüyen, 6 ayda bir yeniden eğitim) örneklem dışı tahmini, 2022-01 →; "en kötü %30 değil" eşiği her an önceki 90 günün tahminlerinden (canlıda uygulanabilir). Masa örnekleri düzeltilmiş simülatörle (11 Ekim 2026) yeniden üretildi; işlem sonucu buradaki simülatörden: giriş karar mumundan sonraki 15 dk mumun VWAP'ı + kayma %0,03, taker %0,05; çıkış süre dolunca VWAP (taker + kayma) ya da stop. R birimi 2 × sd × giriş (bugünkü boy; felaket stopta ve stopsuzda kayıp 1R'yi aşabilir). Fonlama arşivden, basit getiri. Coin+yön başına tek açık işlem. "Haftalık t": haftanın işlemlerinin % toplamı (eşit boy), haftalar arası t. "t (işlem)": işlemler bağımsız sayılarak R'nin t'si (iyimser; 72 sa işlemler üst üste biner).

| küme | ufuk · stop | işlem | R tümü | t (işlem) | 1. yarı | 2. yarı | son 12 ay | % / işlem | en kötü işlem % | haftalık t | en kötü hafta % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| masa short (kalite tahmini olan) | 24 sa · stop 2 × sd | 17.077 | -0,015 | -2,5 | -0,021 | -0,009 | -0,001 | -0,108 | -10,9 | -0,9 | -322,1 |
| masa short (kalite tahmini olan) | 24 sa · felaket 4 × ATR(1 sa) | 17.042 | -0,011 | -1,9 | -0,019 | -0,004 | +0,001 | -0,075 | -29,2 | -0,6 | -344,5 |
| masa short (kalite tahmini olan) | 24 sa · stopsuz | 16.727 | -0,019 | -2,8 | -0,024 | -0,014 | +0,001 | -0,120 | -94,2 | -0,9 | -394,2 |
| masa short (kalite tahmini olan) | 72 sa · stop 2 × sd | 9.472 | +0,030 | +2,4 | +0,025 | +0,036 | +0,056 | +0,169 | -16,7 | +0,7 | -369,1 |
| masa short (kalite tahmini olan) | 72 sa · felaket 4 × ATR(1 sa) | 9.520 | +0,018 | +1,4 | +0,018 | +0,019 | +0,038 | +0,113 | -29,2 | +0,4 | -381,3 |
| masa short (kalite tahmini olan) | 72 sa · stopsuz | 8.304 | +0,024 | +1,4 | +0,010 | +0,037 | +0,110 | +0,154 | -86,8 | +0,4 | -746,1 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 24 sa · stop 2 × sd | 13.068 | +0,005 | +0,7 | -0,002 | +0,012 | +0,015 | +0,024 | -10,8 | +0,2 | -201,4 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 24 sa · felaket 4 × ATR(1 sa) | 13.104 | +0,012 | +1,7 | +0,000 | +0,023 | +0,023 | +0,069 | -29,2 | +0,6 | -191,5 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 24 sa · stopsuz | 12.895 | -0,001 | -0,1 | -0,011 | +0,010 | +0,023 | -0,004 | -94,2 | -0,0 | -231,5 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 72 sa · stop 2 × sd | 7.569 | +0,064 | +4,6 | +0,058 | +0,069 | +0,081 | +0,399 | -16,7 | +1,5 | -220,5 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 72 sa · felaket 4 × ATR(1 sa) | 7.691 | +0,049 | +3,5 | +0,050 | +0,048 | +0,053 | +0,310 | -29,2 | +1,2 | -310,7 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) | 72 sa · stopsuz | 6.802 | +0,062 | +3,4 | +0,050 | +0,074 | +0,116 | +0,403 | -79,3 | +1,2 | -610,9 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 24 sa · stop 2 × sd | 6.773 | -0,060 | -6,0 | -0,061 | -0,058 | -0,031 | -0,395 | -10,8 | -2,3 | -289,9 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 24 sa · felaket 4 × ATR(1 sa) | 6.702 | -0,058 | -5,6 | -0,057 | -0,058 | -0,032 | -0,372 | -25,9 | -2,1 | -301,7 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 24 sa · stopsuz | 6.613 | -0,058 | -5,0 | -0,055 | -0,062 | -0,033 | -0,370 | -61,9 | -1,9 | -326,2 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 72 sa · stop 2 × sd | 4.489 | -0,048 | -2,6 | -0,033 | -0,062 | -0,006 | -0,361 | -15,2 | -1,2 | -310,8 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 72 sa · felaket 4 × ATR(1 sa) | 4.392 | -0,043 | -2,2 | -0,032 | -0,052 | -0,000 | -0,293 | -29,1 | -0,9 | -274,8 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) | 72 sa · stopsuz | 3.943 | -0,067 | -2,7 | -0,092 | -0,043 | +0,063 | -0,420 | -86,8 | -1,0 | -547,9 |
| masa short ∧ en kötü %30 değil (yalnız B) | 24 sa · stop 2 × sd | 12.567 | -0,007 | -1,0 | -0,014 | +0,001 | +0,007 | -0,050 | -10,8 | -0,5 | -214,4 |
| masa short ∧ en kötü %30 değil (yalnız B) | 24 sa · felaket 4 × ATR(1 sa) | 12.584 | -0,003 | -0,4 | -0,013 | +0,007 | +0,006 | -0,024 | -24,0 | -0,2 | -196,3 |
| masa short ∧ en kötü %30 değil (yalnız B) | 24 sa · stopsuz | 12.373 | -0,012 | -1,5 | -0,025 | +0,001 | +0,011 | -0,076 | -72,1 | -0,6 | -265,1 |
| masa short ∧ en kötü %30 değil (yalnız B) | 72 sa · stop 2 × sd | 7.266 | +0,054 | +3,8 | +0,046 | +0,061 | +0,090 | +0,330 | -16,7 | +1,3 | -266,6 |
| masa short ∧ en kötü %30 değil (yalnız B) | 72 sa · felaket 4 × ATR(1 sa) | 7.335 | +0,039 | +2,8 | +0,029 | +0,050 | +0,071 | +0,248 | -24,0 | +1,0 | -290,1 |
| masa short ∧ en kötü %30 değil (yalnız B) | 72 sa · stopsuz | 6.503 | +0,045 | +2,3 | +0,008 | +0,081 | +0,162 | +0,291 | -109,8 | +0,8 | -459,8 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 24 sa · stop 2 × sd | 13.527 | +0,001 | +0,1 | -0,009 | +0,011 | +0,017 | -0,001 | -10,9 | -0,0 | -210,5 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 24 sa · felaket 4 × ATR(1 sa) | 13.538 | +0,004 | +0,7 | -0,007 | +0,016 | +0,016 | +0,025 | -29,2 | +0,2 | -213,5 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 24 sa · stopsuz | 13.312 | -0,006 | -0,8 | -0,016 | +0,005 | +0,015 | -0,037 | -94,2 | -0,3 | -213,7 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 72 sa · stop 2 × sd | 7.852 | +0,050 | +3,7 | +0,043 | +0,056 | +0,085 | +0,305 | -16,7 | +1,2 | -328,7 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 72 sa · felaket 4 × ATR(1 sa) | 7.916 | +0,042 | +3,0 | +0,033 | +0,050 | +0,077 | +0,266 | -29,2 | +1,0 | -328,5 |
| masa short ∧ en kötü %30 değil (HEPSI-B) | 72 sa · stopsuz | 7.003 | +0,046 | +2,5 | +0,025 | +0,068 | +0,139 | +0,302 | -99,3 | +0,9 | -692,7 |
| masa long (kalite tahmini olan) | 24 sa · stop 2 × sd | 12.297 | -0,035 | -4,1 | -0,049 | -0,021 | +0,003 | -0,221 | -11,0 | -2,3 | -249,9 |
| masa long (kalite tahmini olan) | 24 sa · felaket 4 × ATR(1 sa) | 12.280 | -0,027 | -3,3 | -0,045 | -0,009 | +0,008 | -0,172 | -53,5 | -1,7 | -243,1 |
| masa long (kalite tahmini olan) | 24 sa · stopsuz | 12.090 | -0,022 | -2,5 | -0,037 | -0,006 | +0,012 | -0,129 | -46,3 | -1,2 | -273,3 |
| masa long (kalite tahmini olan) | 72 sa · stop 2 × sd | 7.142 | -0,010 | -0,4 | -0,041 | +0,022 | -0,000 | +0,015 | -12,3 | +0,0 | -266,0 |
| masa long (kalite tahmini olan) | 72 sa · felaket 4 × ATR(1 sa) | 7.147 | +0,001 | +0,0 | -0,033 | +0,036 | +0,006 | +0,065 | -53,5 | +0,2 | -275,3 |
| masa long (kalite tahmini olan) | 72 sa · stopsuz | 6.201 | +0,010 | +0,4 | -0,001 | +0,022 | +0,010 | +0,127 | -85,3 | +0,3 | -368,9 |
| masa long ∧ en kötü %30 değil (HEPSI) | 24 sa · stop 2 × sd | 9.449 | -0,037 | -4,3 | -0,045 | -0,029 | -0,013 | -0,229 | -11,0 | -2,5 | -211,4 |
| masa long ∧ en kötü %30 değil (HEPSI) | 24 sa · felaket 4 × ATR(1 sa) | 9.471 | -0,028 | -3,2 | -0,046 | -0,009 | +0,007 | -0,177 | -53,5 | -1,9 | -217,8 |
| masa long ∧ en kötü %30 değil (HEPSI) | 24 sa · stopsuz | 9.327 | -0,022 | -2,4 | -0,033 | -0,010 | +0,010 | -0,133 | -35,5 | -1,3 | -238,7 |
| masa long ∧ en kötü %30 değil (HEPSI) | 72 sa · stop 2 × sd | 5.663 | -0,015 | -0,8 | -0,019 | -0,010 | -0,038 | -0,085 | -12,3 | -0,4 | -224,8 |
| masa long ∧ en kötü %30 değil (HEPSI) | 72 sa · felaket 4 × ATR(1 sa) | 5.742 | +0,001 | +0,0 | -0,019 | +0,021 | -0,012 | +0,010 | -53,5 | +0,0 | -240,2 |
| masa long ∧ en kötü %30 değil (HEPSI) | 72 sa · stopsuz | 5.045 | +0,007 | +0,3 | +0,025 | -0,011 | -0,052 | +0,043 | -85,3 | +0,1 | -263,6 |
| rastgele short (2022+, bütün toplantılar) | 24 sa · stop 2 × sd | 50.792 | -0,019 | -5,0 | -0,024 | -0,013 | -0,003 | -0,123 | -67,5 | -1,5 | -705,0 |
| rastgele short (2022+, bütün toplantılar) | 24 sa · felaket 4 × ATR(1 sa) | 49.981 | -0,013 | -3,3 | -0,017 | -0,008 | +0,001 | -0,083 | -81,3 | -1,0 | -666,3 |
| rastgele short (2022+, bütün toplantılar) | 24 sa · stopsuz | 44.301 | -0,018 | -3,6 | -0,022 | -0,014 | -0,004 | -0,105 | -302,8 | -1,1 | -812,0 |
| rastgele short (2022+, bütün toplantılar) | 72 sa · stop 2 × sd | 23.134 | -0,002 | -0,3 | -0,014 | +0,009 | +0,030 | -0,024 | -42,8 | -0,1 | -723,9 |
| rastgele short (2022+, bütün toplantılar) | 72 sa · felaket 4 × ATR(1 sa) | 22.724 | +0,001 | +0,2 | -0,010 | +0,013 | +0,021 | +0,003 | -70,8 | +0,0 | -667,8 |
| rastgele short (2022+, bütün toplantılar) | 72 sa · stopsuz | 16.468 | -0,013 | -0,7 | -0,009 | -0,018 | +0,012 | -0,065 | -1.058,5 | -0,2 | -1.456,8 |

## Yıl yıl, 72 sa (R)

| küme · stop | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|
| masa short (kalite tahmini olan) · stop 2 × sd | +0,094 | -0,037 | -0,010 | +0,062 | -0,001 |
| masa short (kalite tahmini olan) · felaket 4 × ATR(1 sa) | +0,090 | -0,042 | -0,025 | +0,035 | -0,001 |
| masa short (kalite tahmini olan) · stopsuz | +0,142 | -0,129 | -0,073 | +0,081 | +0,040 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) · stop 2 × sd | +0,145 | -0,027 | +0,056 | +0,088 | +0,012 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) · felaket 4 × ATR(1 sa) | +0,138 | -0,032 | +0,039 | +0,055 | +0,009 |
| masa short ∧ kalite en kötü %30 değil (HEPSI) · stopsuz | +0,190 | -0,104 | +0,017 | +0,130 | +0,015 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) · stop 2 × sd | +0,037 | -0,103 | -0,135 | -0,060 | -0,037 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) · felaket 4 × ATR(1 sa) | +0,042 | -0,102 | -0,158 | -0,021 | -0,040 |
| masa short ∧ kalite en kötü %30 (atılanlar, HEPSI) · stopsuz | +0,010 | -0,227 | -0,208 | -0,001 | -0,001 |
| masa short ∧ en kötü %30 değil (yalnız B) · stop 2 × sd | +0,093 | +0,009 | +0,028 | +0,088 | +0,020 |
| masa short ∧ en kötü %30 değil (yalnız B) · felaket 4 × ATR(1 sa) | +0,081 | -0,010 | +0,020 | +0,055 | +0,032 |
| masa short ∧ en kötü %30 değil (yalnız B) · stopsuz | +0,095 | -0,066 | -0,013 | +0,113 | +0,067 |
| masa short ∧ en kötü %30 değil (HEPSI-B) · stop 2 × sd | +0,133 | -0,040 | +0,022 | +0,073 | +0,013 |
| masa short ∧ en kötü %30 değil (HEPSI-B) · felaket 4 × ATR(1 sa) | +0,118 | -0,042 | +0,021 | +0,059 | +0,018 |
| masa short ∧ en kötü %30 değil (HEPSI-B) · stopsuz | +0,176 | -0,153 | -0,001 | +0,112 | +0,032 |
| masa long (kalite tahmini olan) · stop 2 × sd | -0,093 | +0,025 | -0,063 | +0,047 | +0,035 |
| masa long (kalite tahmini olan) · felaket 4 × ATR(1 sa) | -0,091 | +0,029 | -0,053 | +0,080 | +0,039 |
| masa long (kalite tahmini olan) · stopsuz | -0,171 | +0,120 | -0,040 | +0,050 | +0,043 |
| masa long ∧ en kötü %30 değil (HEPSI) · stop 2 × sd | -0,087 | +0,045 | -0,015 | -0,030 | -0,016 |
| masa long ∧ en kötü %30 değil (HEPSI) · felaket 4 × ATR(1 sa) | -0,082 | +0,051 | -0,010 | +0,013 | +0,010 |
| masa long ∧ en kötü %30 değil (HEPSI) · stopsuz | -0,138 | +0,144 | +0,018 | -0,030 | -0,026 |
| rastgele short (2022+, bütün toplantılar) · stop 2 × sd | +0,096 | -0,106 | -0,038 | +0,045 | -0,009 |
| rastgele short (2022+, bütün toplantılar) · felaket 4 × ATR(1 sa) | +0,104 | -0,101 | -0,027 | +0,043 | -0,003 |
| rastgele short (2022+, bütün toplantılar) · stopsuz | +0,150 | -0,140 | -0,031 | -0,043 | +0,002 |

## Çıkış nedenleri, 72 sa · stop 2 × sd

- masa short (kalite tahmini olan): zaman %59, stop %41, son %0
- masa short ∧ kalite en kötü %30 değil (HEPSI): zaman %62, stop %38, son %0
- masa short ∧ kalite en kötü %30 (atılanlar, HEPSI): zaman %54, stop %46, son %0
- masa short ∧ en kötü %30 değil (yalnız B): zaman %61, stop %39, son %0
- masa short ∧ en kötü %30 değil (HEPSI-B): zaman %61, stop %39, son %0
- masa long (kalite tahmini olan): stop %46, zaman %54
- masa long ∧ en kötü %30 değil (HEPSI): stop %44, zaman %56
- rastgele short (2022+, bütün toplantılar): stop %45, zaman %55, son %0
