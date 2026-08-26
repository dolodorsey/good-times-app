import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const target='scripts/apply-concierge-ui-v2.mjs';
let code=fs.readFileSync(target,'utf8');
code=code.replace('${realmEvents.length}','\\${realmEvents.length}');
fs.writeFileSync(target,code);
await import(pathToFileURL(process.cwd()+'/'+target).href+'?v='+Date.now());
