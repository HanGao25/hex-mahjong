import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { HexRoom } from './HexRoom.js';
const port = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_PORT');
const origins = (process.env.WEB_ORIGINS ?? `http://localhost:5173,http://127.0.0.1:5173,http://localhost:${port},http://127.0.0.1:${port}`).split(',').map(s => s.trim());
const app = express();
app.use(cors({origin: origins}));
app.get('/health', (_req,res) => res.json({ok:true,app:'hex-mahjong',version:'hex-playtest'}));
app.use(express.json({limit:'1kb'}));
app.post('/recover-seat', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!req.headers.origin || !origins.includes(req.headers.origin)) { res.sendStatus(403); return; }
  if (!/^[1-9][0-9]{5}$/.test(req.body?.roomId)) { res.sendStatus(400); return; }
  try {
    const token = await matchMaker.remoteRoomCall(req.body.roomId, 'recoverUsername', [req.body.username]);
    res.json({token});
  } catch { res.status(409).json({error:'RECOVERY_UNAVAILABLE'}); }
});
app.use(express.static(fileURLToPath(new URL('../../web/dist/', import.meta.url))));
const game = new Server({transport: new WebSocketTransport({server:createServer(app),maxPayload:4096,
  verifyClient: (info, done) => done(!!info.origin && origins.includes(info.origin), 403, 'Origin not allowed')
})});
game.define('hex', HexRoom);
await game.listen(port);
console.log(`Hex Mahjong listening on ${port}`);
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { void game.gracefullyShutdown(); });
