import { BotGame } from './bot-game.js';
import type { ClientAction, RoomSettings, TableSnapshot } from '@hex/shared';
interface Message { type: 'init'; settings: RoomSettings }
interface ActionMessage { type: 'action'; action: ClientAction }
// No document, sockets, fetch, Node APIs, or external service is needed for solo play.
const host = globalThis as unknown as {
  onmessage: ((event: MessageEvent<Message | ActionMessage>) => void) | null;
  postMessage: (message: { type: 'table'; snapshot: TableSnapshot } | { type: 'error'; code: string }) => void;
};
const randomWords = (size: number) => crypto.getRandomValues(new Uint32Array(size));
let game: BotGame | null = null;
host.onmessage = ({ data }) => {
  try {
    if (data.type === 'init') {
      game?.dispose();
      game = new BotGame(data.settings, {
        rng: { next: () => randomWords(1)[0]! / 0x100000000 },
        id: () => [...randomWords(4)].map(n => n.toString(16).padStart(8, '0')).join(''),
        now: () => Date.now(),
        later: (callback, milliseconds) => { const timer = setTimeout(callback, milliseconds); return () => clearTimeout(timer); },
        snapshot: snapshot => host.postMessage({ type: 'table', snapshot }),
        error: code => host.postMessage({ type: 'error', code }),
      });
    } else if (data.type === 'action') game?.receive(data.action);
  } catch { host.postMessage({ type: 'error', code: 'LOCAL_GAME_ERROR' }); }
};
