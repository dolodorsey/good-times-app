import base64,gzip,json,hashlib,pathlib,subprocess
root=pathlib.Path(__file__).parent
parts=[(root/f'part{i}.txt').read_text() for i in range(5)]
repairs=root/'repairs.json'
if repairs.exists():
 for n,edits in json.loads(repairs.read_text()).items():
  s=parts[int(n)]
  for a,b,t in sorted(edits,reverse=True):s=s[:a]+t+s[b:]
  parts[int(n)]=s
expected=['cd422f07fc16d357ae275dca5c947019b7b406de','a701be0f817ba71eb6336d6930495c2bdf15e1b1','e63a512f77f109fc66689574eef866a17e2b0dba','e9aef125a4de829167b1fde014dd4ab1f1bbd7f6','10eec75e4c3618a726f370efb5785f648935a85e']
for i,p in enumerate(parts):
 b=p.encode();actual=hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
 assert actual==expected[i],f'Transport part {i} checksum mismatch: {actual}'
b=gzip.decompress(base64.b64decode(''.join(parts),validate=True))
assert hashlib.sha256(b).hexdigest()=='1d3c2e07297e409bc1bb42b26b5f35be4b08bd79d38ac9d5ac607d9a49c26c9f'
p=json.loads(b)
assert p['base']=='9ce3552415826bba16798b8bddaf077cc06438fb'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==p['base']
def path_for(name):
 path=pathlib.PurePosixPath(name)
 assert not path.is_absolute() and '..' not in path.parts
 assert name.startswith(('src/','api/','scripts/','supabase/migrations/','docs/')) or name in ['vite.config.js','.github/workflows/compact-workspace-capture.yml']
 return pathlib.Path(name)
for f in p['new']:
 path=path_for(f['path']);assert not path.exists(),f'Existing new path {path}'
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(f['content'])
for f in p['edits']:
 path=path_for(f['path'])
 if f.get('delete'):
  assert f['path']=='.github/workflows/compact-workspace-capture.yml';path.unlink();continue
 text=path.read_text();assert hashlib.sha256(text.encode()).hexdigest()==f['sha256'],f'Base changed {path}'
 for a,b,replacement in sorted(f['edits'],reverse=True):text=text[:a]+replacement+text[b:]
 path.write_text(text)
print('Exact source delta verified and materialized. No production or scheduler change.')
