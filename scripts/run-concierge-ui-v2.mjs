import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const target='scripts/apply-concierge-ui-v2.mjs';
let code=fs.readFileSync(target,'utf8');
const bad='{realmEvents.length>0?\\`${realmEvents.length} experiences\\`:"Check this week"}';
const good='{realmEvents.length>0?`\\${realmEvents.length} experiences`:"Check this week"}';
if(code.includes(bad)){
  code=code.replace(bad,good);
  fs.writeFileSync(target,code);
}
await import(pathToFileURL(process.cwd()+'/'+target).href+'?v='+Date.now());
