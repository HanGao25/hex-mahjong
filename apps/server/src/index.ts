import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { HexRoom } from './HexRoom.js';
const port = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_PORT');
const origins = (process.env.WEB_ORIGINS ?? `http://localhost:5173,http://127.0.0.1:5173,http://localhost:${port},http://127.0.0.1:${port}`).split(',').map(s => s.trim());
const app = express();
app.use(cors({origin: origins}));
app.get('/health', (_req,res) => res.json({ok:true,app:'hex-mahjong',version:'hex-playtest'}));
app.use(express.static(fileURLToPath(new URL('../../web/dist/', import.meta.url))));
const game = new Server({transport: new WebSocketTransport({server:createServer(app),maxPayload:4096,
  verifyClient: (info, done) => done(!!info.origin && origins.includes(info.origin), 403, 'Origin not allowed')
})});
game.define('hex', HexRoom);
await game.listen(port);
console.log(`Hex Mahjong listening on ${port}`);
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { void game.gracefullyShutdown(); });
