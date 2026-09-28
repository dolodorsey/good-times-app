from pathlib import Path
# Bounded developer edits only. Actual resulting source is committed before tests.
changes={}
for name in ['api/browse.js','api/plan.js','api/saved-content.js']:
 p=Path(name);s=p.read_text();needle='Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`'
 assert needle in s,(name,'Expected public-header integration anchor is absent')
 s="import {publicApiHeaders} from '../src/lib/public-api-headers.js'\n"+s
 for old,new in [('{apikey:KHG_SUPABASE_ANON_KEY,Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`,Accept:\'application/json\'}','publicApiHeaders(KHG_SUPABASE_ANON_KEY)'),('{apikey:KHG_SUPABASE_ANON_KEY,Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`}','publicApiHeaders(KHG_SUPABASE_ANON_KEY)')]:s=s.replace(old,new)
 assert needle not in s
 changes[name]=s
p='src/features/intelligence/client.js';s=Path(p).read_text();old="const gatewayHeaders = {\n  apikey: KHG_SUPABASE_ANON_KEY,\n  Authorization: `Bearer ${KHG_SUPABASE_ANON_KEY}`,\n  'Content-Type': 'application/json',\n}";assert s.count(old)==1;s=s.replace(old,"const gatewayHeaders = publicApiHeaders(KHG_SUPABASE_ANON_KEY, { 'Content-Type': 'application/json' })");changes[p]="import {publicApiHeaders} from '../../lib/public-api-headers.js'\n"+s
p='src/growth.js';s=Path(p).read_text();old='Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`,';assert s.count(old)==1;changes[p]=s.replace(old,"...(KHG_SUPABASE_ANON_KEY.startsWith('sb_publishable_')?{}:{Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`}),")
for p,s in changes.items():Path(p).write_text(s)
print('Public-header integration completed:', ', '.join(changes))
