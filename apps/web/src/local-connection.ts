import type { ClientAction, RoomSettings, TableSnapshot } from '@hex/shared';
export interface GameConnection { sessionId: string; send: (type: string, action: ClientAction) => void; leave: () => unknown }
export function localConnection(settings: RoomSettings, snapshot: (snapshot: TableSnapshot) => void, error: (code: string) => void, username = ""): GameConnection {
  const worker = new Worker(new URL('./bot-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<{ type: 'table'; snapshot: TableSnapshot } | { type: 'error'; code: string }>) => {
    if (data.type === 'table') snapshot(data.snapshot); else error(data.code);
  };
  worker.onerror = () => error('LOCAL_GAME_ERROR');
  worker.postMessage({ type: 'init', settings, username });
  return { sessionId: 'local-player', send: (_type, action) => worker.postMessage({ type: 'action', action }), leave: () => worker.terminate() };
}
