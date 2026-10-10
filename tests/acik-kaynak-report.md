# Açık kaynak Freqtrade stratejileri · Binance vadeli arşivi

Tarih: 2026-10-10. Betik: `tests/freqtrade-test.py` (rapor: `tests/freqtrade-report.py`).

## Kısa sonuç

- Test edilen: 80 strateji/zaman dilimi; çalışmayan 1, kapsam dışı 13.
- Maliyet sonrası iki yarıda da ve son 12 ayda artı olan: **3**: Low_BB (15m), ReinforcedAverageStrategy (4h), BinHV27 (1h)
- Bunlardan en iyi %1 işlemi çıkarınca da (iki yarı + son 12 ay) artı kalan: **0**.
- Maliyetsiz kaba ortalaması artı olan: 35 / 79; maliyetle artı: 14 / 79.

## Yorum

- Kâğıt üstünde geçen stratejilerin hepsi birkaç dev kazanca dayanıyor: en kârlı %1 işlem atılınca ortalama eksiye dönüyor (Low_BB ve ReinforcedAverage'ın medyan işlemi de −%1,7 / −%2,6). Kazançlar çöküş fitillerinde alınıp %50–90 ROI'ye ulaşan işlemlerden (LUNA, BCH, BLZ, MYX gibi); bunlar tekrarlanabilir bir kenar değil, şans ve 2020–21 boğası.
- 10 yuvalı portföyde yıllık getirisi artı olan 5 / 79; 65 stratejide en büyük düşüş %60'ı geçiyor. İşlem başı ortalaması artı olan BinHV27 (1 sa) bile portföyde eksi: yuvalar aylarca tutulan zarardaki pozisyonlarla doluyor, dev kazançların bir kısmı portföye hiç girmiyor.
- Yıl yıl artı olan strateji sayısı: 2020 44/77, 2021 33/78, 2022 5/78, 2023 42/78, 2024 21/78, 2025 1/77, 2026 8/77. 2022 ve 2025'te neredeyse hepsi eksi. Yüksek kazanma oranlı (%80–95) 5 dk scalp stratejileri 15 dk / 1 sa'te maliyetle eksi (küçük ROI hedefleri gidiş-dönüş %0,16 maliyeti karşılamıyor). 5 dk'da maliyet oranı daha da büyük olur.
- Sınır: 1 dk / 5 dk stratejiler kendi zaman diliminde test edilmedi (arşivde 5 dk yok); ROI tablosunun dakika anahtarları 15 dk'lık adımlarla uygulanıyor. Freqtrade'in kendi motoru değil, aynı kurallarla yazılmış simülatör.

## Yöntem

- Kaynak: github.com/freqtrade/freqtrade-strategies (resmi depo, `user_data/strategies`; depo `lookahead_bias` klasörünü geleceğe bakan örnek diye ayırdığı için o hariç). Stratejilerin kendi kodu çalıştı; parametreler değiştirilmedi.
- Veri: Binance USDⓈ-M arşivi (data.binance.vision), 2020-06 → bugün. Evren: her ay önceki 30 günün hacmine göre ilk 30 coin (listeden çıkanlar dahil, TradFi hariç); giriş yalnız coin o ay evrendeyken.
- Zaman dilimi: 1 dk / 5 dk stratejiler 15 dk mumlarda (elimizdeki en kısa), 4 sa / 12 sa 1 sa'ten toplanarak, 1 g arşivden. Strateji içi yeniden örnekleme katları çalışılan zaman dilimine göre (freqtrade `--timeframe` gibi).
- İşlem: sinyal mum kapanışında, giriş sonraki açılışta; stop/ROI mum içinde (aynı mumda ikisi → stop), çıkış sinyali sonraki açılışta; iz süren stop yalnız önceki mumların tepesiyle. Maliyet taraf başına %0,05 komisyon + %0,03 kayma (gidiş-dönüş ≈ %0,16), fonlama arşivden. Kaldıraç 1.
- Getiri işlem başına, fiyat hareketi olarak (kaldıraçsız). Portföy: en çok 10 açık işlem, her işleme gerçekleşmiş özkaynağın 1/10'u; yıllık getiri ve en büyük düşüş bundan.
- Geçme şartı: ilk yarı, ikinci yarı ve son 12 ay ortalamasının üçü de maliyet sonrası > 0 (yarılarda ≥ 30, son 12 ayda ≥ 20 işlem).

## Tüm stratejiler (maliyet sonrası ortalamaya göre)

| Strateji | Asıl | Test | İşlem | Ort. % | En iyi %1 hariç | Medyan % | Maliyetsiz % | Kazanma | PF | 1. yarı | 2. yarı | Son 12 ay | Yıllık | En büyük düşüş | Medyan tutuş |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| MultiMa | 4h | 4h | 2779 | +0,48 | -0,04 | +0,13 | +0,64 | %51 | 1,10 | +0,88 | +0,10 | -0,27 | %+8 | %85 | 56,0 sa |
| **Low_BB** | 1m | 15m | 6615 | +0,47 | -0,04 | -1,66 | +0,63 | %5 | 1,29 | +0,58 | +0,33 | +0,02 | %+8 | %61 | 0,2 sa |
| **ReinforcedAverageStrategy** | 4h | 4h | 4449 | +0,36 | -0,14 | -2,58 | +0,52 | %26 | 1,11 | +0,47 | +0,26 | +0,25 | %+22 | %73 | 52,0 sa |
| FSampleStrategy | 1h | 1h | 6541 | +0,34 | -0,68 | -5,16 | +0,50 | %8 | 1,07 | +0,71 | -0,04 | -1,20 | %-12 | %93 | 32,0 sa |
| **BinHV27** | 5m | 1h | 3890 | +0,33 | -0,06 | +1,38 | +0,49 | %60 | 1,11 | +0,50 | +0,14 | +0,15 | %-13 | %83 | 55,0 sa |
| AverageStrategy | 4h | 4h | 9453 | +0,31 | -0,19 | -2,50 | +0,47 | %26 | 1,09 | +0,66 | -0,02 | -0,40 | %+0 | %89 | 52,0 sa |
| GodStra | 12h | 12h | 701 | +0,25 | -0,14 | +8,51 | +0,41 | %61 | 1,03 | +1,06 | -0,13 | -0,08 | %-4 | %73 | 156,0 sa |
| Diamond | 5m | 1h | 970 | +0,05 | -0,01 | -0,12 | +0,21 | %45 | 1,10 | -0,07 | +0,50 | -0,63 | %+0 | %9 | 3,0 sa |
| UniversalMACD | 5m | 15m | 18878 | +0,04 | -0,04 | +0,26 | +0,20 | %56 | 1,04 | +0,11 | -0,04 | -0,33 | %-17 | %96 | 2,8 sa |
| Diamond | 5m | 15m | 1376 | +0,04 | -0,00 | -0,11 | +0,20 | %43 | 1,09 | +0,11 | -0,10 | -0,29 | %-1 | %13 | 3,0 sa |
| CombinedBinHAndCluc | 5m | 15m | 26851 | +0,01 | -0,04 | +1,00 | +0,17 | %65 | 1,01 | +0,06 | -0,05 | -0,29 | %-45 | %99 | 2,5 sa |
| SmoothScalp | 1m | 1h | 2592 | +0,01 | -0,00 | +0,84 | +0,17 | %88 | 1,01 | +0,25 | -0,22 | -0,14 | %-0 | %28 | 1,0 sa |
| AwesomeMacd | 1h | 1h | 13874 | +0,01 | -0,10 | -1,64 | +0,17 | %34 | 1,00 | +0,19 | -0,18 | -0,58 | %-12 | %93 | 23,0 sa |
| ReinforcedSmoothScalp | 1m | 15m | 2063 | +0,00 | -0,02 | +1,82 | +0,16 | %73 | 1,00 | +0,21 | -0,17 | -0,16 | %-0 | %24 | 7,5 sa |
| ReinforcedQuickie | 5m | 15m | 38711 | -0,06 | -0,07 | +0,84 | +0,10 | %83 | 0,92 | -0,03 | -0,09 | -0,18 | %-35 | %95 | 1,5 sa |
| BinHV27 | 5m | 15m | 13466 | -0,06 | -0,29 | +0,63 | +0,10 | %59 | 0,97 | +0,06 | -0,18 | +0,07 | %-21 | %91 | 13,8 sa |
| hlhb | 4h | 4h | 2849 | -0,07 | -0,28 | +0,81 | +0,09 | %64 | 0,96 | +0,02 | -0,15 | -0,60 | %-7 | %49 | 8,0 sa |
| CofiBitStrategy | 5m | 15m | 44610 | -0,07 | -0,13 | +0,18 | +0,09 | %60 | 0,88 | -0,03 | -0,11 | -0,13 | %-45 | %99 | 1,2 sa |
| ReinforcedSmoothScalp | 1m | 1h | 485 | -0,07 | -0,09 | +1,83 | +0,09 | %82 | 0,95 | +0,31 | -0,38 | +0,78 | %-1 | %16 | 8,0 sa |
| SmoothScalp | 1m | 15m | 9297 | -0,08 | -0,09 | +0,84 | +0,08 | %78 | 0,88 | +0,00 | -0,17 | -0,18 | %-11 | %67 | 1,5 sa |
| CMCWinner | 15m | 15m | 23589 | -0,08 | -0,13 | -0,02 | +0,08 | %49 | 0,87 | -0,04 | -0,13 | -0,16 | %-27 | %94 | 0,8 sa |
| SwingHighToSky | 15m | 15m | 28230 | -0,09 | -0,24 | +0,12 | +0,07 | %53 | 0,92 | -0,10 | -0,09 | -0,27 | %-44 | %99 | 4,2 sa |
| Strategy004 | 5m | 15m | 9670 | -0,09 | -0,14 | +0,84 | +0,07 | %86 | 0,92 | -0,00 | -0,19 | -0,22 | %-19 | %81 | 1,8 sa |
| CofiBitStrategy | 5m | 1h | 11247 | -0,10 | -0,17 | +0,53 | +0,06 | %64 | 0,92 | -0,03 | -0,15 | +0,02 | %-21 | %86 | 5,0 sa |
| Supertrend | 1h | 1h | 24862 | -0,10 | -0,19 | +2,67 | +0,06 | %59 | 0,96 | -0,04 | -0,15 | -0,32 | %-23 | %96 | 20,0 sa |
| Bandtastic | 15m | 15m | 119544 | -0,11 | -0,20 | +0,43 | +0,05 | %59 | 0,91 | -0,05 | -0,16 | -0,23 | %-70 | %100 | 7,0 sa |
| FSupertrendStrategy | 1h | 1h | 35633 | -0,11 | -0,21 | +2,32 | +0,05 | %68 | 0,95 | -0,10 | -0,12 | -0,16 | %-23 | %94 | 7,0 sa |
| EMASkipPump | 5m | 15m | 110724 | -0,11 | -0,22 | +0,49 | +0,05 | %59 | 0,92 | -0,09 | -0,14 | -0,22 | %-90 | %100 | 6,0 sa |
| MultiRSI | 5m | 15m | 61912 | -0,12 | -0,13 | +0,84 | +0,04 | %76 | 0,84 | -0,09 | -0,14 | -0,25 | %-65 | %100 | 1,0 sa |
| PowerTower | 5m | 15m | 31511 | -0,12 | -0,29 | -0,07 | +0,04 | %48 | 0,91 | -0,07 | -0,15 | -0,27 | %-61 | %100 | 2,8 sa |
| Scalp | 1m | 15m | 41086 | -0,13 | -0,14 | +0,24 | +0,03 | %63 | 0,74 | -0,10 | -0,15 | -0,16 | %-54 | %99 | 0,8 sa |
| Low_BB | 1m | 1h | 6607 | -0,14 | -0,65 | -1,66 | +0,02 | %3 | 0,91 | -0,31 | +0,05 | +0,08 | %-28 | %94 | 0,0 sa |
| ADXMomentum | 1h | 1h | 63792 | -0,15 | -0,16 | +0,84 | +0,01 | %91 | 0,84 | -0,13 | -0,16 | -0,24 | %-51 | %99 | 1,0 sa |
| ASDTSRockwellTrading | 5m | 1h | 121612 | -0,15 | -0,20 | +0,84 | +0,01 | %64 | 0,84 | -0,14 | -0,16 | -0,22 | %-70 | %100 | 2,0 sa |
| BinHV45 | 1m | 15m | 4330 | -0,16 | -0,17 | +1,09 | +0,00 | %80 | 0,84 | -0,15 | -0,17 | -0,29 | %-10 | %49 | 0,0 sa |
| Strategy004 | 5m | 1h | 3216 | -0,17 | -0,22 | +0,84 | -0,01 | %87 | 0,87 | -0,20 | -0,12 | -0,29 | %-9 | %46 | 1,0 sa |
| TechnicalExampleStrategy | 5m | 15m | 552485 | -0,17 | -0,18 | +0,22 | -0,01 | %60 | 0,69 | -0,16 | -0,18 | -0,21 | %-100 | %100 | 0,5 sa |
| UniversalMACD | 5m | 1h | 19186 | -0,17 | -0,24 | -0,01 | -0,01 | %50 | 0,81 | -0,12 | -0,23 | -0,27 | %-48 | %99 | 3,0 sa |
| ASDTSRockwellTrading | 5m | 15m | 311026 | -0,18 | -0,23 | -0,39 | -0,02 | %42 | 0,76 | -0,18 | -0,17 | -0,17 | %-99 | %100 | 1,2 sa |
| FReinforcedStrategy | 5m | 1h | 3530 | -0,19 | -0,26 | -0,41 | -0,03 | %39 | 0,84 | -0,24 | -0,12 | -0,10 | %-9 | %46 | 4,0 sa |
| FReinforcedStrategy | 5m | 15m | 10978 | -0,20 | -0,27 | -0,28 | -0,04 | %31 | 0,70 | -0,19 | -0,20 | -0,21 | %-28 | %88 | 1,0 sa |
| PowerTower | 5m | 1h | 29522 | -0,20 | -0,34 | -0,07 | -0,04 | %48 | 0,85 | -0,18 | -0,21 | -0,33 | %-56 | %100 | 3,0 sa |
| FAdxSmaStrategy | 1h | 1h | 3158 | -0,21 | -0,29 | -0,69 | -0,05 | %35 | 0,86 | -0,13 | -0,29 | -0,22 | %-9 | %45 | 7,0 sa |
| Simple | 5m | 15m | 140946 | -0,21 | -0,22 | +0,84 | -0,05 | %83 | 0,75 | -0,22 | -0,20 | -0,24 | %-83 | %100 | 1,0 sa |
| ClucMay72018 | 5m | 15m | 18609 | -0,23 | -0,24 | +0,84 | -0,07 | %79 | 0,74 | -0,20 | -0,28 | -0,54 | %-46 | %98 | 0,0 sa |
| Scalp | 1m | 1h | 11332 | -0,24 | -0,25 | +0,84 | -0,08 | %71 | 0,69 | -0,24 | -0,23 | -0,20 | %-34 | %93 | 1,0 sa |
| HourBasedStrategy | 1h | 1h | 51404 | -0,24 | -0,44 | -0,11 | -0,08 | %48 | 0,92 | -0,20 | -0,29 | -0,45 | %-72 | %100 | 31,0 sa |
| Strategy002 | 5m | 1h | 350 | -0,25 | -0,29 | +0,84 | -0,09 | %87 | 0,79 | -0,33 | -0,18 | -0,82 | %-1 | %10 | 2,0 sa |
| TechnicalExampleStrategy | 5m | 1h | 238195 | -0,25 | -0,26 | +0,84 | -0,09 | %71 | 0,69 | -0,25 | -0,25 | -0,31 | %-99 | %100 | 1,0 sa |
| Simple | 5m | 1h | 55193 | -0,25 | -0,27 | +0,84 | -0,09 | %90 | 0,74 | -0,24 | -0,26 | -0,32 | %-65 | %100 | 1,0 sa |
| BinHV45 | 1m | 1h | 3385 | -0,25 | -0,27 | +1,09 | -0,09 | %78 | 0,77 | -0,40 | -0,11 | -0,60 | %-13 | %61 | 0,0 sa |
| MACDStrategy | 5m | 15m | 32504 | -0,26 | -0,31 | +0,84 | -0,10 | %95 | 0,80 | -0,26 | -0,25 | -0,24 | %-63 | %100 | 2,5 sa |
| MACDStrategy_crossed | 5m | 1h | 3466 | -0,26 | -0,31 | +0,84 | -0,10 | %95 | 0,80 | -0,33 | -0,19 | -0,31 | %-18 | %74 | 3,0 sa |
| AdxSmas | 1h | 1h | 24859 | -0,26 | -0,37 | -0,23 | -0,10 | %47 | 0,89 | -0,31 | -0,21 | -0,20 | %-53 | %99 | 22,0 sa |
| Strategy002 | 5m | 15m | 1103 | -0,27 | -0,33 | +0,84 | -0,11 | %86 | 0,77 | -0,04 | -0,45 | +0,10 | %-5 | %35 | 2,5 sa |
| Strategy003 | 5m | 15m | 3528 | -0,28 | -0,34 | +0,84 | -0,12 | %85 | 0,76 | -0,31 | -0,27 | -0,24 | %-14 | %70 | 2,8 sa |
| Quickie | 5m | 15m | 27159 | -0,29 | -0,37 | +0,84 | -0,13 | %94 | 0,80 | -0,33 | -0,24 | -0,25 | %-54 | %100 | 3,2 sa |
| TrendFollowingStrategy | 5m | 15m | 18187 | -0,29 | -0,41 | +4,81 | -0,13 | %82 | 0,93 | -0,26 | -0,33 | -0,76 | %-40 | %99 | 22,5 sa |
| Strategy001 | 5m | 1h | 12088 | -0,29 | -0,34 | +0,84 | -0,13 | %88 | 0,76 | -0,34 | -0,25 | -0,26 | %-43 | %98 | 3,0 sa |
| Strategy001 | 5m | 15m | 36707 | -0,30 | -0,35 | +0,84 | -0,14 | %88 | 0,76 | -0,31 | -0,29 | -0,40 | %-73 | %100 | 3,2 sa |
| SmoothOperator | 5m | 15m | 25492 | -0,30 | -0,41 | -0,24 | -0,14 | %49 | 0,87 | -0,37 | -0,24 | -0,17 | %-56 | %100 | 13,8 sa |
| Heracles | 4h | 4h | 3538 | -0,32 | -0,51 | +0,24 | -0,16 | %53 | 0,93 | -0,41 | -0,23 | -0,91 | %-14 | %90 | 124,0 sa |
| EMASkipPump | 5m | 1h | 37647 | -0,32 | -0,42 | -0,54 | -0,16 | %48 | 0,87 | -0,36 | -0,28 | -0,33 | %-89 | %100 | 16,0 sa |
| CombinedBinHAndCluc | 5m | 1h | 21962 | -0,33 | -0,38 | +0,87 | -0,17 | %57 | 0,85 | -0,41 | -0,23 | -0,25 | %-74 | %100 | 6,0 sa |
| mabStra | 4h | 4h | 20110 | -0,33 | -0,73 | -0,23 | -0,17 | %46 | 0,94 | -0,29 | -0,36 | -0,65 | %-65 | %100 | 68,0 sa |
| MACDStrategy_crossed | 5m | 15m | 10161 | -0,34 | -0,39 | +0,84 | -0,18 | %94 | 0,73 | -0,28 | -0,40 | -0,21 | %-40 | %97 | 3,2 sa |
| Quickie | 5m | 1h | 16080 | -0,36 | -0,44 | +0,84 | -0,20 | %94 | 0,76 | -0,40 | -0,31 | -0,32 | %-47 | %99 | 4,0 sa |
| ClucMay72018 | 5m | 1h | 15934 | -0,36 | -0,37 | +0,84 | -0,20 | %79 | 0,65 | -0,32 | -0,40 | -0,47 | %-56 | %100 | 0,0 sa |
| Strategy003 | 5m | 1h | 769 | -0,37 | -0,42 | +0,84 | -0,21 | %87 | 0,72 | -0,32 | -0,41 | -0,12 | %-4 | %30 | 2,0 sa |
| Strategy005 | 5m | 15m | 7668 | -0,38 | -0,43 | +1,83 | -0,22 | %82 | 0,79 | -0,41 | -0,36 | -0,47 | %-37 | %95 | 8,8 sa |
| ReinforcedQuickie | 5m | 1h | 55 | -0,38 | -0,40 | +0,84 | -0,22 | %78 | 0,63 | -1,17 | -0,09 | +0,73 | %-0 | %4 | 1,0 sa |
| MACDStrategy | 5m | 1h | 18134 | -0,40 | -0,45 | +0,84 | -0,24 | %95 | 0,71 | -0,43 | -0,37 | -0,43 | %-57 | %100 | 2,0 sa |
| BbandRsi | 1h | 1h | 7399 | -0,40 | -0,51 | +3,41 | -0,24 | %64 | 0,92 | -0,28 | -0,53 | -0,82 | %-46 | %99 | 73,0 sa |
| TDSequentialStrategy | 1h | 1h | 18587 | -0,40 | -0,78 | -5,11 | -0,24 | %40 | 0,86 | -0,29 | -0,50 | -0,71 | %-71 | %100 | 18,0 sa |
| CCIStrategy | 1m | 15m | 3010 | -0,43 | -0,53 | -2,16 | -0,27 | %16 | 0,77 | -0,19 | -0,65 | -0,49 | %-19 | %77 | 4,8 sa |
| TrendFollowingStrategy | 5m | 1h | 13821 | -0,47 | -0,59 | +4,80 | -0,31 | %82 | 0,89 | -0,59 | -0,34 | -1,04 | %-42 | %99 | 30,0 sa |
| SmoothOperator | 5m | 1h | 8805 | -0,60 | -0,71 | -5,14 | -0,44 | %36 | 0,82 | -0,58 | -0,62 | -0,73 | %-52 | %99 | 22,0 sa |
| PatternRecognition | 1d | 1d | 2901 | -0,72 | -1,19 | +5,26 | -0,56 | %68 | 0,89 | -0,98 | -0,45 | -2,66 | %-29 | %96 | 120,0 sa |
| Strategy005 | 5m | 1h | 1470 | -0,83 | -0,88 | +1,83 | -0,67 | %77 | 0,64 | -0,62 | -0,98 | -0,77 | %-17 | %73 | 7,0 sa |
| CCIStrategy | 1m | 1h | 0 | – | – | – | – | – | – | – | – | – | – | – | – |

Ort. = işlem başına ortalama getiri (%, maliyet ve fonlama sonrası). En iyi %1 hariç = en kârlı %1 işlem atılınca ortalama (sonuç birkaç dev kazanca mı dayanıyor). Maliyetsiz = komisyon ve kayma eklenmeden. Yıllık ve düşüş 10 yuvalı portföyden.

## Yıl yıl (geçenler ve en iyi ortalamalar; parantezde işlem sayısı)

| Strateji | Test | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | Long | Short | Çıkışlar |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Low_BB | 15m | +1,66 (646) | +0,82 (1707) | -0,44 (828) | +0,94 (680) | +0,42 (863) | -0,24 (871) | +0,20 (1020) | +0,47 | – | stop 6337, roi 276, veri sonu 2 |
| ReinforcedAverageStrategy | 4h | +1,92 (468) | +1,00 (1022) | -2,22 (309) | +0,76 (807) | +0,23 (798) | -0,76 (615) | +0,13 (430) | +0,36 | – | sinyal 4162, roi 207, stop 79, veri sonu 1 |
| BinHV27 | 1h | +0,86 (325) | +2,07 (616) | -1,02 (729) | +0,17 (522) | +0,29 (564) | +0,79 (685) | -0,74 (449) | +0,33 | – | sinyal 3830, stop 43, veri sonu 15, roi 2 |
| MultiMa | 4h | +0,59 (468) | +2,85 (463) | -1,50 (247) | +1,61 (390) | +0,92 (461) | -2,54 (430) | +0,43 (320) | +0,48 | – | roi 2038, sinyal 530, stop 210, veri sonu 1 |
| FSampleStrategy | 1h | +3,82 (507) | +2,76 (1079) | -1,55 (1232) | +2,78 (707) | -0,47 (998) | -1,69 (1163) | -0,39 (855) | +0,37 | -2,21 | stop 6025, roi 277, sinyal 211, veri sonu 28 |
| AverageStrategy | 4h | +1,89 (817) | +1,08 (1519) | -0,43 (1431) | +1,03 (1491) | +0,14 (1471) | -1,04 (1551) | +0,22 (1173) | +0,31 | – | sinyal 8930, roi 383, stop 138, veri sonu 2 |
| GodStra | 12h | +5,50 (48) | +1,54 (81) | +0,09 (57) | -1,56 (70) | +1,73 (190) | -3,89 (132) | +0,60 (123) | +0,25 | – | roi 498, stop 195, veri sonu 8 |
| Diamond | 1h | -0,18 (255) | +0,13 (239) | -0,40 (134) | +0,22 (246) | +0,89 (84) | -0,36 (5) | -0,70 (7) | +0,05 | – | roi 932, stop 25, sinyal 13 |

## Çalışmayan / kapsam dışı

- MultiRSI (1h): çalışmadı: ValueError: Tried to merge a faster timeframe to a slower timeframe. Upsampling is not possible.
- AlmgrenChrissStrategy: emir yürütme algoritması
- BreakEven: yardımcı örnek (başabaş)
- CustomStoplossWithPSAR: custom_stoploss
- FixedRiskRewardLoss: custom_stoploss
- InformativeSample: başka coin/zaman dilimi verisi (DataProvider)
- Strategy001_custom_exit: custom_exit
- TWAPStrategy: emir yürütme algoritması
- TrendRiderStrategy: custom_exit
- DoesNothingStrategy: işlem yapmıyor
- Freqtrade_backtest_validation_freqtrade1: freqtrade doğrulama örneği
- FOttStrategy: çok yavaş (satır satır pandas döngüsü; tek coin saatler sürüyor)
- VolatilitySystem: adjust_trade_position
- multi_tf: başka coin/zaman dilimi verisi (DataProvider)
