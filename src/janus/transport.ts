import ws from 'ws';
import { TransactionType, Transaction, ResponsePayload } from './transaction';
import { EventEmitter } from 'events';
const logger = console;

let connection: ws;

// region public
/**
 * Janus request
 * @param {TransactionType} type
 * @param {object} data
 * @return {Promise}
 */
export async function request(type: TransactionType, data?: object) {
  return new Promise((resolve, reject) => {
    const transaction = Transaction.create(type, data);
    transaction.on('success', resolve);
    transaction.on('error', reject);
    connection.send(transaction.serialize());
    logger.info('janus send', transaction.serialize());
  });
}
// endregion

// region initialization
/**
 * init transport
 * @param {string} addr
 * @param {string} proto
 */
export function init(addr: string, proto: string) {
  const events = new EventEmitter();
  logger.info('connecting to Janus server:', addr);
  connection = new ws(addr, proto);
  connection.on('open', () => {
    logger.info('connected to Janus server:', addr);
  });
  connection.on('message', (data: string) => {
    logger.info('janus message', data);
    try {
      const body = <ResponsePayload>JSON.parse(data);
      if (['success', 'ack', 'error'].includes(body.janus)) {
        // this is response
        Transaction.close(body.transaction, body);
      } else if (['trickle', 'event', 'webrtcup', 'media'].includes(body.janus)) {
        // this is event
        events.emit('event', body);
      }
    } catch (err) {
      logger.error('message handle error', err.message);
    }
  });
  connection.on('error', (err) => {
    logger.error('Janus server error:', err.stack);
  });
  connection.on('close', () => {
    logger.info('connection to Janus server closed');
    init(addr, proto);
  });
  return events;
}
// endregion
