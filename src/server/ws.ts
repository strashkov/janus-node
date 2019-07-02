import ws from 'ws';
import { IncomingMessage } from 'http';

const logger = console;

const sockets: Map<number, Set<ws>> = new Map();

/**
 * Create WebSocket Server
 * @param {number} port
 * @return {{send(sessionID: number, type: string, data: any): void}}
 */
export function create(port: number): { send(sessionID: number, type: string, data: any): void } {
  const wsServer = new ws.Server(
    {
      port,
    },
    () => {
      logger.info('local ws server running on port', port);
    });

  wsServer.on('connection', (socket: ws, { url }: IncomingMessage) => {
    const sessionID = url && parseInt(url.replace('/', ''), 10);
    if (!sessionID) {
      return;
    }
    const sessionSockets = sockets.get(sessionID) || new Set();
    sessionSockets.add(socket);
    sockets.set(sessionID, sessionSockets);
    logger.info('new ws connection', sessionID);
    socket.on('open', () => {
      logger.info('socket.onopen');
    });
    socket.on('close', (code: number, reason: string) => {
      logger.info('socket.onclose', code, reason);
      const sessionSockets = sockets.get(sessionID);
      if (sessionSockets) {
        sessionSockets.delete(socket);
      }
    });
    socket.on('error', (err) => {
      logger.error('socket.onerror', err.stack);
    });
  });

  return {
    /**
     * Send data to ws clients by session id
     * @param {number} sessionID
     * @param {string} type
     * @param data
     */
    send(sessionID: number, type: string, data: any):void {
      const sessionSockets = sockets.get(sessionID);
      if (sessionSockets) {
        for (const socket of sessionSockets) {
          socket.send(JSON.stringify({
            type,
            data,
          }));
        }
      }
    },
  };
}
