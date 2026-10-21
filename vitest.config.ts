import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({test:{pool:'threads',include:['packages/**/*.test.ts','apps/server/test/**/*.test.ts','apps/web/test/**/*.test.ts'],testTimeout:15000},resolve:{alias:Object.fromEntries(['shared','mahjong-engine','hextech-engine'].map(name=>[`@hex/${name}`,fileURLToPath(new URL(`./packages/${name}/src/index.ts`,import.meta.url))]))}});
