# Test #44 · Birleşim: masa + 24 sa çıkış + limit giriş + 7 g süzgeci (arşiv)

10 Ekim 2026 · `node tests/test44-birlesim.js` · tanım `dongu/2026-10-10-r-kaldiraclari.md` §10

Masa örnekleri (ayın ilk 30 coini, 4 saatte bir iki yön, 2020-06-01 → 2026-10-08). Masa = bugünkü giriş kuralı (veto yok, puan ≥ 35, evet ≥ 3). Çıkış: dolumdan 24 sa sonraki 15 dk mumun VWAP'ı ya da stop 1 × sd (eski kod; gün içi, dolum mumunda yalnız kapanışla). Hedef/iz yok. Maliyet: market taker %0,05 + kayma %0,03, limit maker %0,02; çıkış taker + kayma; fonlama arşivden. R birimi stop uzaklığı (1 × sd × giriş). Coin+yön başına tek açık işlem. Süzgeç (2): coinin 7 g getirisi işlem yönüne karşıysa atla; (1): long ve BTC 24 sa > 0 ise atla.

Düzeltilmiş simülatör: bu test kendi yolunu yürütür (açılış → ters uç → çıkış mumunun VWAP'ı), `simBot`'u kullanmaz; PR #36'daki yanlılık burada yok.

## Ortalama R (maliyet + fonlama dahil)

| küme · giriş | işlem | tümü | 1. yarı | 2. yarı | son 12 ay | 6 ay (2 Nis → 6 Eki 2026) | t (haftalık) | % / işlem | stop | rastgele yön R (tümü / son 12 ay) | yön bilgisi R (tümü / 1. / 2. / son 12) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| masa · süzgeçsiz · market (sonraki mum VWAP) | 57.200 | -0,089 | -0,087 | -0,091 | -0,073 | -0,094 | -4,3 | -0,144 % | %74 | -0,098 / -0,118 | +0,009 / -0,001 / +0,019 / +0,044 |
| masa · süzgeçsiz · limit kapanış, 4 mum | 56.649 | -0,043 | -0,039 | -0,048 | -0,010 | -0,050 | -2,1 | -0,072 % | %73 | -0,050 / -0,067 | +0,011 / -0,003 / +0,024 / +0,060 |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | 56.271 | -0,089 | -0,087 | -0,091 | -0,055 | -0,092 | -4,3 | -0,143 % | %74 | -0,059 / -0,075 | +0,006 / -0,009 / +0,021 / +0,058 |
| masa · süzgeçsiz · limit −%0,3, 8 mum | 51.498 | -0,050 | -0,058 | -0,043 | -0,001 | -0,019 | -2,2 | -0,083 % | %74 | +0,097 / +0,116 | +0,011 / -0,011 / +0,033 / +0,073 |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | 46.750 | -0,079 | -0,075 | -0,083 | -0,076 | -0,082 | -4,6 | -0,128 % | %74 | -0,100 / -0,123 | +0,021 / +0,012 / +0,030 / +0,047 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | 46.359 | -0,036 | -0,030 | -0,042 | -0,014 | -0,046 | -2,6 | -0,061 % | %73 | -0,053 / -0,070 | +0,022 / +0,013 / +0,030 / +0,060 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | 46.062 | -0,080 | -0,077 | -0,083 | -0,054 | -0,081 | -4,7 | -0,131 % | %74 | -0,063 / -0,076 | +0,020 / +0,010 / +0,030 / +0,064 |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | 42.152 | -0,043 | -0,046 | -0,040 | -0,007 | -0,015 | -2,5 | -0,073 % | %74 | +0,092 / +0,096 | +0,021 / +0,001 / +0,043 / +0,085 |
| masa · (1)+(2) · market (sonraki mum VWAP) | 32.977 | -0,043 | -0,028 | -0,059 | -0,077 | -0,138 | -2,8 | -0,068 % | %72 | -0,091 / -0,141 | +0,047 / +0,045 / +0,049 / +0,064 |
| masa · (1)+(2) · limit kapanış, 4 mum | 32.652 | +0,007 | +0,027 | -0,012 | -0,005 | -0,079 | -1,2 | +0,010 % | %71 | -0,041 / -0,077 | +0,052 / +0,054 / +0,051 / +0,076 |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | 32.193 | -0,038 | -0,017 | -0,057 | -0,051 | -0,124 | -2,9 | -0,061 % | %72 | -0,049 / -0,087 | +0,050 / +0,053 / +0,048 / +0,074 |
| masa · (1)+(2) · limit −%0,3, 8 mum | 29.182 | -0,005 | +0,007 | -0,016 | -0,004 | -0,063 | -1,4 | -0,010 % | %72 | +0,103 / +0,073 | +0,043 / +0,031 / +0,054 / +0,095 |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | 130.934 | -0,076 | -0,077 | -0,076 | -0,046 | -0,097 | -3,3 | -0,133 % | %74 | -0,108 / -0,090 | +0,032 / +0,034 / +0,030 / +0,044 |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | 130.070 | -0,041 | -0,042 | -0,041 | +0,006 | -0,060 | -1,2 | -0,078 % | %73 | -0,069 / -0,032 | +0,033 / +0,034 / +0,032 / +0,043 |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | 105.195 | -0,048 | -0,037 | -0,060 | -0,035 | -0,107 | -1,5 | -0,088 % | %72 | -0,103 / -0,091 | +0,055 / +0,062 / +0,048 / +0,056 |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | 104.448 | -0,011 | -0,000 | -0,022 | +0,020 | -0,071 | +0,4 | -0,029 % | %72 | -0,062 / -0,031 | +0,056 / +0,062 / +0,050 / +0,056 |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | 17.200 | -0,068 | — | -0,068 | -0,077 | -0,085 | -2,5 | -0,114 % | %73 | -0,109 / -0,123 | +0,041 / — / +0,041 / +0,046 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | 17.074 | -0,023 | — | -0,023 | -0,016 | -0,049 | -1,4 | -0,047 % | %72 | -0,060 / -0,070 | +0,041 / — / +0,041 / +0,059 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | 16.942 | -0,066 | — | -0,066 | -0,056 | -0,083 | -2,6 | -0,113 % | %74 | -0,067 / -0,076 | +0,040 / — / +0,040 / +0,063 |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | 15.816 | -0,057 | — | -0,057 | -0,060 | -0,066 | -2,2 | -0,096 % | %73 | -0,108 / -0,118 | +0,052 / — / +0,052 / +0,058 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | 15.664 | -0,011 | — | -0,011 | -0,005 | -0,041 | -1,1 | -0,026 % | %72 | -0,060 / -0,064 | +0,054 / — / +0,054 / +0,065 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | 15.502 | -0,053 | — | -0,053 | -0,044 | -0,079 | -2,2 | -0,091 % | %73 | -0,064 / -0,066 | +0,049 / — / +0,049 / +0,066 |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | 12.978 | -0,042 | — | -0,042 | -0,079 | -0,142 | -1,3 | -0,078 % | %72 | -0,109 / -0,142 | +0,067 / — / +0,067 / +0,063 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | 12.864 | +0,012 | — | +0,012 | -0,007 | -0,083 | -0,2 | +0,006 % | %71 | -0,054 / -0,078 | +0,071 / — / +0,071 / +0,075 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | 12.680 | -0,033 | — | -0,033 | -0,053 | -0,128 | -1,4 | -0,066 % | %72 | -0,062 / -0,088 | +0,068 / — / +0,068 / +0,072 |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | 11.972 | -0,036 | — | -0,036 | -0,067 | -0,121 | -1,5 | -0,067 % | %72 | -0,112 / -0,139 | +0,075 / — / +0,075 / +0,072 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | 11.843 | +0,021 | — | +0,021 | +0,005 | -0,067 | -0,4 | +0,020 % | %71 | -0,057 / -0,074 | +0,083 / — / +0,083 / +0,084 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | 11.657 | -0,026 | — | -0,026 | -0,044 | -0,125 | -1,6 | -0,055 % | %72 | -0,063 / -0,081 | +0,075 / — / +0,075 / +0,075 |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | 253.753 | -0,100 | -0,093 | -0,106 | -0,091 | -0,109 | -17,6 | -0,164 % | %74 | -0,106 / -0,094 | +0,007 / +0,020 / -0,007 / +0,003 |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | 252.327 | -0,067 | -0,063 | -0,072 | -0,054 | -0,077 | -11,6 | -0,111 % | %74 | -0,065 / -0,045 | +0,003 / +0,011 / -0,006 / -0,005 |

"Yön bilgisi" = (yön − ters yön) ÷ 2: aynı anda ters yöne girmeye göre kazanç. Taban kümeleri masanın puanına bakmaz.

## Long / short (R; tümü / 1. yarı / 2. yarı / son 12 ay)

| küme · giriş | long | short |
|---|---|---|
| masa · süzgeçsiz · market (sonraki mum VWAP) | -0,121 / -0,126 / -0,115 / -0,085 (26.773) | -0,062 / -0,050 / -0,072 / -0,067 (30.427) |
| masa · süzgeçsiz · limit kapanış, 4 mum | -0,081 / -0,089 / -0,072 / -0,017 (26.579) | -0,010 / +0,010 / -0,028 / -0,007 (30.070) |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | -0,128 / -0,143 / -0,111 / -0,047 (26.445) | -0,054 / -0,032 / -0,075 / -0,060 (29.826) |
| masa · süzgeçsiz · limit −%0,3, 8 mum | -0,091 / -0,114 / -0,065 / +0,004 (24.243) | -0,014 / -0,002 / -0,024 / -0,004 (27.255) |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | -0,115 / -0,129 / -0,100 / -0,074 (21.466) | -0,048 / -0,024 / -0,070 / -0,076 (25.284) |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | -0,080 / -0,094 / -0,064 / -0,023 (21.349) | +0,002 / +0,033 / -0,025 / -0,010 (25.010) |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | -0,125 / -0,145 / -0,102 / -0,058 (21.252) | -0,042 / -0,012 / -0,069 / -0,053 (24.810) |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | -0,088 / -0,111 / -0,060 / -0,013 (19.489) | -0,005 / +0,016 / -0,024 / -0,004 (22.663) |
| masa · (1)+(2) · market (sonraki mum VWAP) | -0,028 / -0,037 / -0,017 / -0,079 (7.693) | -0,048 / -0,024 / -0,070 / -0,076 (25.284) |
| masa · (1)+(2) · limit kapanış, 4 mum | +0,023 / +0,008 / +0,039 / +0,022 (7.642) | +0,002 / +0,033 / -0,025 / -0,010 (25.010) |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | -0,023 / -0,033 / -0,012 / -0,039 (7.383) | -0,042 / -0,012 / -0,069 / -0,053 (24.810) |
| masa · (1)+(2) · limit −%0,3, 8 mum | -0,004 / -0,022 / +0,016 / -0,005 (6.519) | -0,005 / +0,016 / -0,024 / -0,004 (22.663) |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | -0,102 / -0,102 / -0,102 / -0,095 (62.351) | -0,053 / -0,053 / -0,053 / -0,011 (68.583) |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | -0,074 / -0,073 / -0,074 / -0,055 (62.144) | -0,011 / -0,011 / -0,012 / +0,050 (67.926) |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | -0,038 / -0,009 / -0,072 / -0,092 (36.612) | -0,053 / -0,053 / -0,053 / -0,011 (68.583) |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | -0,010 / +0,017 / -0,041 / -0,050 (36.522) | -0,011 / -0,011 / -0,012 / +0,050 (67.926) |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | -0,099 / — / -0,099 / -0,073 (6.553) | -0,048 / — / -0,048 / -0,079 (10.647) |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | -0,061 / — / -0,061 / -0,022 (6.536) | -0,000 / — / -0,000 / -0,013 (10.538) |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | -0,102 / — / -0,102 / -0,056 (6.492) | -0,043 / — / -0,043 / -0,056 (10.450) |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | -0,075 / — / -0,075 / -0,006 (5.763) | -0,046 / — / -0,046 / -0,084 (10.053) |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | -0,045 / — / -0,045 / +0,018 (5.739) | +0,008 / — / +0,008 / -0,015 (9.925) |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | -0,081 / — / -0,081 / -0,004 (5.668) | -0,037 / — / -0,037 / -0,062 (9.834) |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | -0,015 / — / -0,015 / -0,076 (2.331) | -0,048 / — / -0,048 / -0,079 (10.647) |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | +0,070 / — / +0,070 / +0,026 (2.326) | -0,000 / — / -0,000 / -0,013 (10.538) |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | +0,017 / — / +0,017 / -0,036 (2.230) | -0,043 / — / -0,043 / -0,056 (10.450) |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | +0,016 / — / +0,016 / +0,036 (1.919) | -0,046 / — / -0,046 / -0,084 (10.053) |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | +0,085 / — / +0,085 / +0,122 (1.918) | +0,008 / — / +0,008 / -0,015 (9.925) |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | +0,033 / — / +0,033 / +0,071 (1.823) | -0,037 / — / -0,037 / -0,062 (9.834) |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | -0,120 / -0,104 / -0,137 / -0,151 (129.143) | -0,078 / -0,082 / -0,074 / -0,027 (124.610) |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | -0,092 / -0,079 / -0,105 / -0,113 (128.685) | -0,042 / -0,045 / -0,037 / +0,009 (123.642) |

## Yıl yıl (R)

| küme · giriş | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|
| masa · süzgeçsiz · market (sonraki mum VWAP) | -0,169 | -0,017 | -0,073 | -0,132 | -0,126 | -0,071 | -0,072 |
| masa · süzgeçsiz · limit kapanış, 4 mum | -0,127 | +0,038 | -0,022 | -0,092 | -0,097 | -0,015 | -0,025 |
| masa · süzgeçsiz · limit kapanış, 4 mum, %0,05 geçmeli | -0,184 | -0,005 | -0,065 | -0,146 | -0,137 | -0,062 | -0,062 |
| masa · süzgeçsiz · limit −%0,3, 8 mum | -0,120 | +0,028 | -0,051 | -0,117 | -0,100 | -0,012 | -0,006 |
| masa · (2) 7 g yönünde · market (sonraki mum VWAP) | -0,122 | -0,005 | -0,069 | -0,137 | -0,099 | -0,072 | -0,073 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum | -0,090 | +0,053 | -0,022 | -0,101 | -0,071 | -0,021 | -0,027 |
| masa · (2) 7 g yönünde · limit kapanış, 4 mum, %0,05 geçmeli | -0,152 | +0,009 | -0,061 | -0,150 | -0,112 | -0,070 | -0,060 |
| masa · (2) 7 g yönünde · limit −%0,3, 8 mum | -0,088 | +0,050 | -0,053 | -0,114 | -0,088 | -0,022 | -0,008 |
| masa · (1)+(2) · market (sonraki mum VWAP) | -0,083 | +0,066 | -0,021 | -0,129 | -0,042 | -0,038 | -0,093 |
| masa · (1)+(2) · limit kapanış, 4 mum | -0,052 | +0,136 | +0,031 | -0,080 | -0,024 | +0,031 | -0,038 |
| masa · (1)+(2) · limit kapanış, 4 mum, %0,05 geçmeli | -0,107 | +0,093 | -0,005 | -0,131 | -0,068 | -0,021 | -0,077 |
| masa · (1)+(2) · limit −%0,3, 8 mum | -0,054 | +0,134 | +0,004 | -0,105 | -0,042 | +0,017 | -0,027 |
| taban · yalnız 7 g momentum (masa yok) · market (sonraki mum VWAP) | -0,096 | -0,062 | -0,065 | -0,083 | -0,095 | -0,081 | -0,059 |
| taban · yalnız 7 g momentum (masa yok) · limit kapanış, 4 mum | -0,067 | -0,033 | -0,026 | -0,046 | -0,070 | -0,038 | -0,013 |
| taban · 7 g momentum + (1) (masa yok) · market (sonraki mum VWAP) | -0,041 | -0,025 | -0,029 | -0,074 | -0,050 | -0,071 | -0,050 |
| taban · 7 g momentum + (1) (masa yok) · limit kapanış, 4 mum | -0,008 | +0,011 | +0,006 | -0,034 | -0,025 | -0,025 | -0,003 |
| masa · (2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | — | — | — | — | -0,052 | -0,072 | -0,074 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum | — | — | — | — | -0,022 | -0,021 | -0,029 |
| masa · (2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | -0,064 | -0,070 | -0,062 |
| masa · (2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | — | — | — | — | -0,051 | -0,061 | -0,055 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | — | — | — | — | -0,026 | +0,004 | -0,020 |
| masa · (2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | -0,067 | -0,046 | -0,053 |
| masa · (1)+(2) · Ozan verisi olan saatler · market (sonraki mum VWAP) | — | — | — | — | +0,020 | -0,038 | -0,095 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum | — | — | — | — | +0,048 | +0,031 | -0,041 |
| masa · (1)+(2) · Ozan verisi olan saatler · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | +0,006 | -0,021 | -0,079 |
| masa · (1)+(2) + Ozan en kötü %10 değil · market (sonraki mum VWAP) | — | — | — | — | +0,012 | -0,030 | -0,081 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum | — | — | — | — | +0,039 | +0,046 | -0,029 |
| masa · (1)+(2) + Ozan en kötü %10 değil · limit kapanış, 4 mum, %0,05 geçmeli | — | — | — | — | -0,003 | -0,007 | -0,073 |
| taban · bütün toplantılar (rastgele) · market (sonraki mum VWAP) | -0,111 | -0,088 | -0,092 | -0,105 | -0,112 | -0,095 | -0,102 |
| taban · bütün toplantılar (rastgele) · limit kapanış, 4 mum | -0,090 | -0,064 | -0,050 | -0,072 | -0,083 | -0,056 | -0,068 |
