import { randomString } from '../utils';
import { EventEmitter } from 'events';

const transactions: Map<string, Transaction> = new Map();

// region defines
export type TransactionType =
  'create' | 'attach' | 'keepalive' | 'destroy' | 'message' | 'trickle' | 'hangup';

interface RequestError {
  code: number;
  reason: string;
}

interface RequestPayload {
  plugin?: string;
  opaque_id?: string;
  session_id?: number;
  body?: object;
  handle_id?: number;
  jsep?: object;
}

export interface ResponsePayload {
  janus: string;
  transaction: string;
  session_id?: number;
  data?: object;
  error?: RequestError;
}

// endregion

export class Transaction extends EventEmitter {
  idLength: number = 12;
  id: string;
  type: TransactionType;
  data?: RequestPayload;

  constructor(type: TransactionType, data?: RequestPayload) {
    super();
    this.id = randomString(this.idLength);
    this.type = type;
    this.data = data;
  }

  serialize(): string {
    const data = Object.assign(
      {
        janus: this.type,
        transaction: this.id,
      },
      this.data,
    );

    return JSON.stringify(data);
  }

  success(data: string | object | undefined): void {
    this.emit('success', data);
  }

  error(err: Error): void {
    this.emit('error', err);
  }

  close(body: ResponsePayload): void {
    if (body.janus === 'success' || body.janus === 'ack') {
      this.success(body.data);
    } else if (body.janus === 'error') {
      let err: Error;
      if (body.error) {
        err = new Error(`reason: ${body.error.reason}; code: ${body.error.code}`);
      } else {
        err = new Error('transaction error');
      }
      this.error(err);
    }
  }

  static create(type: TransactionType, data?: RequestPayload): Transaction {
    const transaction = new Transaction(type, data);
    transactions.set(transaction.id, transaction);
    return transaction;
  }

  static close(id: string, body: ResponsePayload): void {
    const transaction = this.get(id);
    transaction.close(body);
    transactions.delete(id);
  }

  static get(id: string): Transaction {
    const transaction = transactions.get(id);
    if (transaction) {
      return transaction;
    }
    throw new Error(`transaction ${id} not found`);
  }
}
