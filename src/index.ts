import { argv } from 'yargs';
import { init as connectToJanus } from './janus/transport';
import { create as createLocalHTTPServer } from './server/http';
import { create as createLocalWSServer } from './server/ws';
import { EventEmitter } from 'events';

const logger = console;

const WS_PORT = parseInt(<string>argv['ws-port'] || process.env.JANUS_NODE_WS_PORT || '8080', 10);
const HTTP_PORT = parseInt(
  <string>argv['http-port'] ||
  process.env.JANUS_NODE_HTTP_PORT ||
  '8081',
  10);
const JANUS_SERVER_ADDRESS = <string>(
  argv['janus-server'] ||
  process.env.JANUS_NODE_SERVER_ADDRESS ||
  'ws://127.0.0.1:8090'
);
const JANUS_PROTOCOL_NAME = 'janus-protocol';

if (!JANUS_SERVER_ADDRESS) {
  throw new Error('janus-server is required');
}
// region process events handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', promise, reason);
});

process.on('warning', (warning) => {
  logger.warn('Global Warning', warning.stack);
});
// endregion

const janusEvents:EventEmitter = connectToJanus(JANUS_SERVER_ADDRESS, JANUS_PROTOCOL_NAME);

const wsServer = createLocalWSServer(WS_PORT);

janusEvents.on('event', ({ session_id, janus, ...body }) => {
  wsServer.send(session_id, janus, body);
});

createLocalHTTPServer(HTTP_PORT);
