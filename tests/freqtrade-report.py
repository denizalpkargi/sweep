# tests/freqtrade-test.py sonucundan Türkçe Markdown rapor üretir.
# Kullanım: python tests/freqtrade-report.py [--in tests/data/arch/freqtrade-results.json] [--out tests/acik-kaynak-report.md]
import json, os, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('--in', dest='inp', default=os.path.join(HERE, 'data', 'arch', 'freqtrade-results.json'))
ap.add_argument('--out', default=os.path.join(HERE, 'acik-kaynak-report.md'))
A = ap.parse_args()
D = json.load(open(A.inp, encoding='utf-8'))

def num(x, d=2, pct=False, sign=True):
    if x is None: return '–'
    v = x * 100 if pct else x
    return (f'{v:+.{d}f}' if sign else f'{v:.{d}f}').replace('.', ',')
def m(st): return num(st.get('mean'), 2, True) if st and st.get('n') else '–'

ok = [r for r in D['results'] if 'all' in r and r['all'].get('n')]
bad = [r for r in D['results'] if 'err' in r]
zero = [r for r in D['results'] if 'all' in r and not r['all'].get('n')]
ok.sort(key=lambda r: -r['all']['mean'])
passed = [r for r in ok if r.get('pass')]
L = []
L.append('# Açık kaynak Freqtrade stratejileri · Binance vadeli arşivi\n')
L.append(f"Tarih: {D['at'][:10]}. Betik: `tests/freqtrade-test.py` (rapor: `tests/freqtrade-report.py`).\n")
L.append('## Kısa sonuç\n')
L.append(f"- Test edilen: {len(ok) + len(zero)} strateji/zaman dilimi; çalışmayan {len(bad)}, kapsam dışı {len(D['skipped'])}.")
L.append(f"- Maliyet sonrası iki yarıda da ve son 12 ayda artı olan: **{len(passed)}**" + (': ' + ', '.join(f"{r['name']} ({r['tf']})" for r in passed) if passed else '.'))
rob = [r for r in ok if r.get('robust')]
L.append(f"- Bunlardan en iyi %1 işlemi çıkarınca da (iki yarı + son 12 ay) artı kalan: **{len(rob)}**" + (': ' + ', '.join(f"{r['name']} ({r['tf']})" for r in rob) if rob else '.'))
L.append(f"- Maliyetsiz kaba ortalaması artı olan: {sum(1 for r in ok if r['gross'] > 0)} / {len(ok)}; maliyetle artı: {sum(1 for r in ok if r['all']['mean'] > 0)} / {len(ok)}.\n")
L.append('## Yorum\n')
L.append("- Kâğıt üstünde geçen stratejilerin hepsi birkaç dev kazanca dayanıyor: en kârlı %1 işlem atılınca ortalama eksiye dönüyor (Low_BB ve ReinforcedAverage'ın medyan işlemi de −%1,7 / −%2,6). Kazançlar çöküş fitillerinde alınıp %50–90 ROI'ye ulaşan işlemlerden (LUNA, BCH, BLZ, MYX gibi); bunlar tekrarlanabilir bir kenar değil, şans ve 2020–21 boğası.")
L.append(f"- 10 yuvalı portföyde yıllık getirisi artı olan {sum(r['port']['cagr'] > 0 for r in ok)} / {len(ok)}; {sum(r['port']['mdd'] >= 0.6 for r in ok)} stratejide en büyük düşüş %60'ı geçiyor. İşlem başı ortalaması artı olan BinHV27 (1 sa) bile portföyde eksi: yuvalar aylarca tutulan zarardaki pozisyonlarla doluyor, dev kazançların bir kısmı portföye hiç girmiyor.")
yc = lambda y: (sum(1 for r in ok if r['years'].get(y, {}).get('n', 0) >= 30 and r['years'][y]['mean'] > 0), sum(1 for r in ok if r['years'].get(y, {}).get('n', 0) >= 30))
L.append("- Yıl yıl artı olan strateji sayısı: " + ', '.join(f"{y} {yc(y)[0]}/{yc(y)[1]}" for y in sorted({y for r in ok for y in r['years']})) + ". 2022 ve 2025'te neredeyse hepsi eksi. Yüksek kazanma oranlı (%80–95) 5 dk scalp stratejileri 15 dk / 1 sa'te maliyetle eksi (küçük ROI hedefleri gidiş-dönüş %0,16 maliyeti karşılamıyor). 5 dk'da maliyet oranı daha da büyük olur.")
L.append("- Sınır: 1 dk / 5 dk stratejiler kendi zaman diliminde test edilmedi (arşivde 5 dk yok); ROI tablosunun dakika anahtarları 15 dk'lık adımlarla uygulanıyor. Freqtrade'in kendi motoru değil, aynı kurallarla yazılmış simülatör.\n")
L.append('## Yöntem\n')
L.append("- Kaynak: github.com/freqtrade/freqtrade-strategies (resmi depo, `user_data/strategies`; depo `lookahead_bias` klasörünü geleceğe bakan örnek diye ayırdığı için o hariç). Stratejilerin kendi kodu çalıştı; parametreler değiştirilmedi.")
L.append(f"- Veri: Binance USDⓈ-M arşivi (data.binance.vision), 2020-06 → bugün. Evren: her ay önceki 30 günün hacmine göre ilk {D['top']} coin (listeden çıkanlar dahil, TradFi hariç); giriş yalnız coin o ay evrendeyken.")
L.append("- Zaman dilimi: 1 dk / 5 dk stratejiler 15 dk mumlarda (elimizdeki en kısa), 4 sa / 12 sa 1 sa'ten toplanarak, 1 g arşivden. Strateji içi yeniden örnekleme katları çalışılan zaman dilimine göre (freqtrade `--timeframe` gibi).")
L.append(f"- İşlem: sinyal mum kapanışında, giriş sonraki açılışta; stop/ROI mum içinde (aynı mumda ikisi → stop), çıkış sinyali sonraki açılışta; iz süren stop yalnız önceki mumların tepesiyle. Maliyet taraf başına %{num(D['fee'], 2, True, False)} komisyon + %{num(D['slip'], 2, True, False)} kayma (gidiş-dönüş ≈ %0,16), fonlama arşivden. Kaldıraç 1.")
L.append("- Getiri işlem başına, fiyat hareketi olarak (kaldıraçsız). Portföy: en çok 10 açık işlem, her işleme gerçekleşmiş özkaynağın 1/10'u; yıllık getiri ve en büyük düşüş bundan.")
L.append("- Geçme şartı: ilk yarı, ikinci yarı ve son 12 ay ortalamasının üçü de maliyet sonrası > 0 (yarılarda ≥ 30, son 12 ayda ≥ 20 işlem).\n")
L.append('## Tüm stratejiler (maliyet sonrası ortalamaya göre)\n')
L.append('| Strateji | Asıl | Test | İşlem | Ort. % | En iyi %1 hariç | Medyan % | Maliyetsiz % | Kazanma | PF | 1. yarı | 2. yarı | Son 12 ay | Yıllık | En büyük düşüş | Medyan tutuş |')
L.append('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
for r in ok:
    a = r['all']; p = r['port']; b = '**' if r.get('pass') else ''
    L.append(f"| {b}{r['name']}{b} | {r.get('native')} | {r['tf']} | {a['n']} | {m(a)} | {num(a.get('trim'), 2, True)} | {num(a.get('med'), 2, True)} | {num(r['gross'], 2, True)} | %{num(a['win'], 0, True, False)} | {num(a.get('pf'), 2, False, False)} | {m(r['h1'])} | {m(r['h2'])} | {m(r['y12'])} | %{num(p['cagr'], 0, True)} | %{num(p['mdd'], 0, True, False)} | {num(r['hold_h'], 1, False, False)} sa |")
for r in zero: L.append(f"| {r['name']} | {r.get('native')} | {r['tf']} | 0 | – | – | – | – | – | – | – | – | – | – | – | – |")
L.append('\nOrt. = işlem başına ortalama getiri (%, maliyet ve fonlama sonrası). En iyi %1 hariç = en kârlı %1 işlem atılınca ortalama (sonuç birkaç dev kazanca mı dayanıyor). Maliyetsiz = komisyon ve kayma eklenmeden. Yıllık ve düşüş 10 yuvalı portföyden.\n')
top = passed + [r for r in ok if not r.get('pass')][:max(0, 8 - len(passed))]
L.append('## Yıl yıl (geçenler ve en iyi ortalamalar; parantezde işlem sayısı)\n')
yrs = sorted({y for r in top for y in r['years']})
L.append('| Strateji | Test | ' + ' | '.join(yrs) + ' | Long | Short | Çıkışlar |')
L.append('|---|---|' + '---:|' * (len(yrs) + 2) + '---|')
for r in top:
    L.append(f"| {r['name']} | {r['tf']} | " + ' | '.join(f"{m(r['years'].get(y))} ({r['years'].get(y, {}).get('n', 0)})" for y in yrs) + f" | {m(r['long'])} | {m(r['short'])} | " + ', '.join(f'{k} {v}' for k, v in sorted(r['exits'].items(), key=lambda x: -x[1])) + ' |')
L.append('\n## Çalışmayan / kapsam dışı\n')
for r in bad: L.append(f"- {r['name']} ({r['tf']}): {r['err']}")
for r in D['skipped']: L.append(f"- {r['name']}: {r['why']}")
open(A.out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('yazıldı', A.out)
