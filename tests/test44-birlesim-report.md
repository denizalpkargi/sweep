# Test #44 · Birleşim: masa + 24 sa çıkış + limit giriş + 7 g süzgeci (arşiv)

10 Ekim 2026 · `node tests/test44-birlesim.js` · tanım `dongu/2026-10-10-r-kaldiraclari.md` §10

Masa örnekleri (ayın ilk 30 coini, 4 saatte bir iki yön, 2020-06-01 → 2026-10-08). Masa = bugünkü giriş kuralı (veto yok, puan ≥ 35, evet ≥ 3). Çıkış: dolumdan 24 sa sonraki 15 dk mumun VWAP'ı ya da stop 2 × sd (bugünkü kod, PR #27; gün içi, dolum mumunda yalnız kapanışla). Hedef/iz yok. Maliyet: market taker %0,05 + kayma %0,03, limit maker %0,02; çıkış taker + kayma; fonlama arşivden. R birimi stop uzaklığı (2 × sd × giriş). Coin+yön başına tek açık işlem. Süzgeç (2): coinin 7 g getirisi işlem yönüne karşıysa atla; (1): long ve BTC 24 sa > 0 ise atla.

Düzeltilmiş simülatör: bu test kendi yolunu yürütür (açılış → ters uç → çıkış mumunun VWAP'ı), `simBot`'u kullanmaz; PR #36'daki yanlılık burada yok.

## Ortalama R (maliyet + fonlama dahil)

| küme · giriş | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | 6 ay (2 Nis → 6 Eki 2026) | t (haftalık) | % / işlem | stop | rastgele yön R (tümü / son 12 ay) | yön bilgisi R (tümü / 1. / 2. / son 12) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| masa · süzgeçsiz · market (sonraki mum VWAP) | 45.056 | -0,041 | -0,037 | -0,045 | -0,020 | -0,032 | -3,0 | -0,137 % | %50 | -0,048 / -0,042 | +0,006 / +0,002 / +0,011 / +0,021 |
| masa · süzgeçsiz · limit kapanış, 4 mum | 44.989 | -0,018 | -0,014 | -0,022 | +0,013 | +0,001 | -1,4 | -0,064 % | %49 | -0,024 / -0,017 | +0,009 / +0,003 / +0,014 / +0,031 |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | 44.475 | -0,038 | -0,036 | -0,040 | -0,006 | -0,020 | -2,8 | -0,127 % | %50 | -0,026 / -0,017 | +0,009 / +0,005 / +0,013 / +0,028 |
| masa · süzgeçsiz · limit −%0,3, 8 mum | 41.843 | -0,021 | -0,025 | -0,018 | +0,010 | +0,001 | -1,6 | -0,076 % | %50 | +0,062 / +0,065 | +0,013 / +0,009 / +0,018 / +0,045 |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | 36.760 | -0,034 | -0,028 | -0,040 | -0,019 | -0,022 | -3,3 | -0,116 % | %50 | -0,051 / -0,049 | +0,017 / +0,017 / +0,017 / +0,030 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | 36.727 | -0,012 | -0,005 | -0,018 | +0,015 | +0,013 | -1,9 | -0,045 % | %50 | -0,029 / -0,026 | +0,020 / +0,020 / +0,019 / +0,043 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | 36.322 | -0,031 | -0,025 | -0,037 | -0,003 | -0,006 | -3,1 | -0,107 % | %51 | -0,030 / -0,022 | +0,021 / +0,024 / +0,019 / +0,042 |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | 34.182 | -0,013 | -0,015 | -0,010 | +0,014 | +0,014 | -1,9 | -0,049 % | %50 | +0,057 / +0,060 | +0,026 / +0,021 / +0,031 / +0,058 |
| masa · (1)+(2) · market (sonraki mum VWAP) | 26.828 | -0,007 | +0,004 | -0,018 | -0,013 | -0,037 | -1,7 | -0,025 % | %48 | -0,043 / -0,052 | +0,036 / +0,040 / +0,031 / +0,039 |
| masa · (1)+(2) · limit kapanış, 4 mum | 26.750 | +0,020 | +0,034 | +0,006 | +0,021 | -0,006 | -0,4 | +0,059 % | %48 | -0,018 / -0,025 | +0,041 / +0,050 / +0,032 / +0,049 |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | 26.295 | -0,001 | +0,011 | -0,013 | +0,004 | -0,025 | -1,4 | -0,008 % | %49 | -0,019 / -0,021 | +0,042 / +0,052 / +0,033 / +0,047 |
| masa · (1)+(2) · limit −%0,3, 8 mum | 24.412 | +0,016 | +0,021 | +0,011 | +0,029 | +0,006 | -0,5 | +0,045 % | %48 | +0,065 / +0,060 | +0,042 / +0,041 / +0,043 / +0,069 |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | 91.360 | -0,038 | -0,036 | -0,040 | -0,015 | -0,043 | -2,2 | -0,128 % | %50 | -0,057 / -0,049 | +0,019 / +0,020 / +0,019 / +0,034 |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | 91.310 | -0,019 | -0,018 | -0,019 | +0,010 | -0,018 | -0,5 | -0,070 % | %50 | -0,034 / -0,028 | +0,019 / +0,017 / +0,022 / +0,042 |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | 74.589 | -0,016 | -0,010 | -0,021 | -0,001 | -0,050 | -0,4 | -0,054 % | %49 | -0,054 / -0,051 | +0,038 / +0,042 / +0,034 / +0,049 |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | 74.596 | +0,002 | +0,008 | -0,004 | +0,019 | -0,033 | +1,0 | -0,001 % | %49 | -0,031 / -0,033 | +0,038 / +0,039 / +0,036 / +0,055 |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | 13.602 | -0,027 | — | -0,027 | -0,020 | -0,022 | -1,8 | -0,101 % | %50 | -0,053 / -0,049 | +0,026 / — / +0,026 / +0,029 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | 13.566 | -0,003 | — | -0,003 | +0,014 | +0,012 | -0,7 | -0,028 % | %49 | -0,030 / -0,025 | +0,030 / — / +0,030 / +0,042 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | 13.403 | -0,023 | — | -0,023 | -0,004 | -0,007 | -1,5 | -0,090 % | %50 | -0,028 / -0,021 | +0,029 / — / +0,029 / +0,040 |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | 12.675 | -0,021 | — | -0,021 | -0,007 | -0,012 | -1,5 | -0,074 % | %49 | -0,051 / -0,045 | +0,030 / — / +0,030 / +0,038 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | 12.641 | +0,004 | — | +0,004 | +0,025 | +0,022 | -0,4 | +0,000 % | %49 | -0,029 / -0,020 | +0,035 / — / +0,035 / +0,047 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | 12.466 | -0,016 | — | -0,016 | +0,006 | +0,003 | -1,2 | -0,060 % | %50 | -0,026 / -0,014 | +0,035 / — / +0,035 / +0,048 |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | 10.448 | -0,007 | — | -0,007 | -0,014 | -0,038 | -0,9 | -0,035 % | %49 | -0,050 / -0,052 | +0,043 / — / +0,043 / +0,038 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | 10.434 | +0,019 | — | +0,019 | +0,020 | -0,008 | +0,1 | +0,042 % | %49 | -0,024 / -0,025 | +0,045 / — / +0,045 / +0,048 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | 10.250 | -0,001 | — | -0,001 | +0,003 | -0,027 | -0,6 | -0,018 % | %49 | -0,022 / -0,020 | +0,045 / — / +0,045 / +0,046 |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | 9.733 | -0,000 | — | -0,000 | -0,003 | -0,031 | -0,7 | -0,011 % | %49 | -0,051 / -0,050 | +0,051 / — / +0,051 / +0,047 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | 9.718 | +0,024 | — | +0,024 | +0,025 | -0,001 | +0,2 | +0,061 % | %49 | -0,026 / -0,025 | +0,053 / — / +0,053 / +0,054 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | 9.533 | +0,004 | — | +0,004 | +0,008 | -0,023 | -0,5 | -0,001 % | %50 | -0,023 / -0,018 | +0,051 / — / +0,051 / +0,049 |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | 173.523 | -0,059 | -0,057 | -0,062 | -0,059 | -0,071 | -17,5 | -0,189 % | %52 | -0,059 / -0,051 | -0,000 / +0,000 / -0,001 / -0,008 |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | 173.573 | -0,042 | -0,040 | -0,044 | -0,039 | -0,053 | -12,1 | -0,132 % | %52 | -0,038 / -0,030 | -0,001 / -0,001 / -0,001 / -0,006 |

"Yön bilgisi" = (yön − ters yön) ÷ 2: aynı anda ters yöne girmeye göre kazanç. Taban kümeleri masanın puanına bakmaz.

## Long / short (R; tümü / 1. yarı / 2. yarı / son 12 ay)

| küme · giriş | long | short |
|---|---|---|
| masa · süzgeçsiz · market (sonraki mum VWAP) | -0,059 / -0,056 / -0,062 / -0,012 (20.793) | -0,026 / -0,019 / -0,032 / -0,025 (24.263) |
| masa · süzgeçsiz · limit kapanış, 4 mum | -0,037 / -0,041 / -0,034 / +0,022 (20.784) | -0,002 / +0,011 / -0,013 / +0,008 (24.205) |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | -0,056 / -0,060 / -0,052 / +0,003 (20.556) | -0,023 / -0,014 / -0,031 / -0,011 (23.919) |
| masa · süzgeçsiz · limit −%0,3, 8 mum | -0,041 / -0,048 / -0,032 / +0,014 (19.383) | -0,005 / -0,003 / -0,007 / +0,009 (22.460) |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | -0,053 / -0,058 / -0,046 / -0,004 (16.578) | -0,019 / -0,001 / -0,035 / -0,026 (20.182) |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | -0,034 / -0,046 / -0,021 / +0,037 (16.598) | +0,007 / +0,032 / -0,016 / +0,004 (20.129) |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | -0,052 / -0,061 / -0,042 / +0,017 (16.426) | -0,014 / +0,008 / -0,034 / -0,013 (19.896) |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | -0,036 / -0,052 / -0,016 / +0,012 (15.517) | +0,006 / +0,019 / -0,006 / +0,016 (18.665) |
| masa · (1)+(2) · market (sonraki mum VWAP) | +0,027 / +0,017 / +0,039 / +0,054 (6.646) | -0,019 / -0,001 / -0,035 / -0,026 (20.182) |
| masa · (1)+(2) · limit kapanış, 4 mum | +0,059 / +0,040 / +0,081 / +0,102 (6.621) | +0,007 / +0,032 / -0,016 / +0,004 (20.129) |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | +0,039 / +0,021 / +0,060 / +0,090 (6.399) | -0,014 / +0,008 / -0,034 / -0,013 (19.896) |
| masa · (1)+(2) · limit −%0,3, 8 mum | +0,046 / +0,025 / +0,072 / +0,101 (5.747) | +0,006 / +0,019 / -0,006 / +0,016 (18.665) |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | -0,055 / -0,043 / -0,068 / -0,049 (42.901) | -0,023 / -0,029 / -0,017 / +0,008 (48.459) |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | -0,037 / -0,032 / -0,042 / -0,020 (42.897) | -0,003 / -0,005 / -0,000 / +0,031 (48.413) |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | -0,002 / +0,023 / -0,030 / -0,024 (26.130) | -0,023 / -0,029 / -0,017 / +0,008 (48.459) |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | +0,012 / +0,031 / -0,010 / -0,009 (26.183) | -0,003 / -0,005 / -0,000 / +0,031 (48.413) |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | -0,044 / — / -0,044 / -0,002 (5.184) | -0,017 / — / -0,017 / -0,028 (8.418) |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | -0,014 / — / -0,014 / +0,038 (5.163) | +0,004 / — / +0,004 / +0,003 (8.403) |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | -0,036 / — / -0,036 / +0,018 (5.095) | -0,015 / — / -0,015 / -0,014 (8.308) |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | -0,034 / — / -0,034 / +0,028 (4.660) | -0,013 / — / -0,013 / -0,023 (8.015) |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | -0,005 / — / -0,005 / +0,069 (4.643) | +0,009 / — / +0,009 / +0,005 (7.998) |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | -0,024 / — / -0,024 / +0,052 (4.566) | -0,011 / — / -0,011 / -0,014 (7.900) |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | +0,033 / — / +0,033 / +0,057 (2.030) | -0,017 / — / -0,017 / -0,028 (8.418) |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | +0,081 / — / +0,081 / +0,105 (2.031) | +0,004 / — / +0,004 / +0,003 (8.403) |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | +0,062 / — / +0,062 / +0,093 (1.942) | -0,015 / — / -0,015 / -0,014 (8.308) |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | +0,059 / — / +0,059 / +0,107 (1.718) | -0,013 / — / -0,013 / -0,023 (8.015) |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | +0,095 / — / +0,095 / +0,139 (1.720) | +0,009 / — / +0,009 / +0,005 (7.998) |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | +0,078 / — / +0,078 / +0,138 (1.633) | -0,011 / — / -0,011 / -0,014 (7.900) |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | -0,072 / -0,061 / -0,084 / -0,098 (87.356) | -0,047 / -0,053 / -0,040 / -0,018 (86.167) |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | -0,057 / -0,048 / -0,066 / -0,080 (87.519) | -0,027 / -0,033 / -0,021 / +0,003 (86.054) |

## Yıl yıl (R)

| küme · giriş | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| masa · süzgeçsiz · market (sonraki mum VWAP) | -0,064 | +0,012 | -0,029 | -0,079 | -0,088 | -0,028 | -0,017 |
| masa · süzgeçsiz · limit kapanış, 4 mum | -0,048 | +0,030 | -0,002 | -0,055 | -0,069 | -0,008 | +0,019 |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | -0,065 | +0,011 | -0,025 | -0,080 | -0,086 | -0,026 | -0,000 |
| masa · süzgeçsiz · limit −%0,3, 8 mum | -0,048 | +0,017 | -0,004 | -0,064 | -0,072 | -0,004 | +0,021 |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | -0,019 | +0,024 | -0,034 | -0,082 | -0,077 | -0,029 | -0,012 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | -0,003 | +0,042 | -0,005 | -0,058 | -0,057 | -0,015 | +0,027 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | -0,029 | +0,025 | -0,024 | -0,077 | -0,077 | -0,039 | +0,011 |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | -0,015 | +0,036 | -0,013 | -0,054 | -0,059 | -0,006 | +0,027 |
| masa · (1)+(2) · market (sonraki mum VWAP) | -0,000 | +0,085 | -0,003 | -0,074 | -0,036 | -0,002 | -0,015 |
| masa · (1)+(2) · limit kapanış, 4 mum | +0,026 | +0,111 | +0,032 | -0,047 | -0,014 | +0,012 | +0,026 |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | -0,003 | +0,093 | +0,012 | -0,073 | -0,034 | -0,011 | +0,010 |
| masa · (1)+(2) · limit −%0,3, 8 mum | +0,024 | +0,094 | +0,020 | -0,050 | -0,020 | +0,013 | +0,035 |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | -0,059 | -0,021 | -0,023 | -0,048 | -0,054 | -0,044 | -0,022 |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | -0,039 | -0,010 | -0,002 | -0,025 | -0,034 | -0,028 | +0,003 |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | -0,027 | -0,001 | -0,002 | -0,023 | -0,021 | -0,031 | -0,012 |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | -0,005 | +0,013 | +0,020 | -0,004 | -0,005 | -0,013 | +0,008 |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | — | — | — | — | -0,044 | -0,028 | -0,013 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | — | — | — | — | -0,021 | -0,015 | +0,026 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | -0,038 | -0,039 | +0,010 |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | — | — | — | — | -0,047 | -0,021 | +0,001 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | — | — | — | — | -0,020 | -0,008 | +0,038 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | -0,035 | -0,032 | +0,022 |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | — | — | — | — | -0,006 | -0,002 | -0,016 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | — | — | — | — | +0,021 | +0,013 | +0,025 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | +0,006 | -0,011 | +0,009 |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | — | — | — | — | -0,005 | +0,005 | -0,005 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | — | — | — | — | +0,023 | +0,019 | +0,032 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | +0,008 | -0,007 | +0,016 |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | -0,068 | -0,053 | -0,058 | -0,060 | -0,064 | -0,053 | -0,066 |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | -0,056 | -0,040 | -0,036 | -0,042 | -0,047 | -0,035 | -0,048 |
