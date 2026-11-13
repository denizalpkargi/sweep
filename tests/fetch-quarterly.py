# BTC çeyreklik vadeli (USDT-M) günlük mumları, data.binance.vision S3 arşivinden (16 Ekim 2026, test #90).
# Çıktı tests/data/arch/quarterly/BTCUSDT_<YYMMDD>.csv (kline satırları). Kullanım: python3 tests/fetch-quarterly.py
import os, io, zipfile, subprocess, re, datetime as dt
S3='https://s3-ap-northeast-1.amazonaws.com/data.binance.vision'; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'data','arch','quarterly')
os.makedirs(OUT,exist_ok=True)
x=subprocess.run(['curl','-s',f'{S3}?prefix=data/futures/um/monthly/klines/BTCUSDT_2&delimiter=/'],capture_output=True,text=True).stdout
for c in re.findall(r'klines/(BTCUSDT_\d{6})/',x):
    e=dt.datetime.strptime(c[-6:],'%y%m%d'); rows=[]
    for k in range(9,-1,-1):
        m=(e.year*12+e.month-1)-k; y,mo=divmod(m,12); tag=f'{y}-{mo+1:02d}'
        b=subprocess.run(['curl','-sf',f'{S3}/data/futures/um/monthly/klines/{c}/1d/{c}-1d-{tag}.zip'],capture_output=True).stdout
        if not b: continue
        z=zipfile.ZipFile(io.BytesIO(b)); rows+= [l for l in z.read(z.namelist()[0]).decode().splitlines() if l and l[0].isdigit()]
    open(f'{OUT}/{c}.csv','w').write('\n'.join(rows)+'\n'); print(c,len(rows),flush=True)
