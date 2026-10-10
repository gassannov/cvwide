import {access} from 'node:fs/promises';
try{await access(new URL('../.local/remote.json',import.meta.url));await import('./remote-local.mjs');}
catch(e){if(e.code!=='ENOENT')throw e;await import('../server.mjs');}
