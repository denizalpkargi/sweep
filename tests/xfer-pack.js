// Veri taşıma: bir klasördeki dosyaları tek tek gzip'ler (alt klasörler dahil; "_" ile başlayanlar atlanır).
// Kullanım: node tests/xfer-pack.js <kaynak> <hedef>      Açma: node tests/xfer-pack.js --unpack <hedef> <kaynak>
const fs=require('fs'), path=require('path'), zlib=require('zlib');
const [a,b,c]=process.argv.slice(2);
function walk(d,rel=''){ let out=[]; for(const n of fs.readdirSync(d)){ if(n.startsWith('_')) continue; const p=path.join(d,n), r=rel?rel+'/'+n:n; if(fs.statSync(p).isDirectory()) out=out.concat(walk(p,r)); else out.push(r); } return out; }
if(a==='--unpack'){ let n=0; for(const r of walk(b)){ if(!r.endsWith('.gz')) continue; const o=path.join(c,r.slice(0,-3)); fs.mkdirSync(path.dirname(o),{recursive:true}); fs.writeFileSync(o,zlib.gunzipSync(fs.readFileSync(path.join(b,r)))); n++; } console.log('açıldı',n); }
else { let raw=0,gz=0,n=0; for(const r of walk(a)){ const buf=fs.readFileSync(path.join(a,r)); const z=zlib.gzipSync(buf,{level:9}); const o=path.join(b,r+'.gz'); fs.mkdirSync(path.dirname(o),{recursive:true}); fs.writeFileSync(o,z); raw+=buf.length; gz+=z.length; n++; if(z.length>90e6) console.log('UYARI 90 MB üstü:',r); }
  console.log(n,'dosya',(raw/1e6).toFixed(1),'MB →',(gz/1e6).toFixed(1),'MB gzip'); }
