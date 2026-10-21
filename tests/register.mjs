// Lets `node --test` run the app's TypeScript modules: extensionless relative imports resolve to .ts,
// and JSON files load as ES modules.
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
