import { request } from './transport';
import { randomString } from '../utils';
import Timeout = NodeJS.Timeout;

const KEEP_ALIVE_INTERVAL = 25 * 1000;

type Plugin = 'janus.plugin.nosip';

export type Command = 'attach' | 'message' | 'trickle' | 'destroy';

const sessions:Map<number, JanusSession> = new Map();

export class JanusSession {
  id: number|undefined;
  private keepAliveInterval: Timeout|undefined;
  constructor() {}

  /**
   * Send "create" request, setting session id
   * @return {Promise<void>}
   */
  async create(): Promise<void> {
    const response = <{id: number}>await request('create');
    this.id = response.id;
    this.keepAliveInterval = global.setInterval(this.keepAlive.bind(this), KEEP_ALIVE_INTERVAL);
  }

  /**
   * Send "keepalive" request
   * @return {Promise<void>}
   */
  private async keepAlive(): Promise<void> {
    await request('keepalive', {
      session_id: this.id,
    });
  }

  /**
   * Attach plugin, create handler
   * @param {Plugin} plugin
   * @return {Promise<number>} return handler id
   */
  async attach({ plugin }: {plugin: Plugin}): Promise<number> {
    const response = <{id: number}>await request('attach', {
      plugin,
      session_id: this.id,
      opaque_id: `caller-${randomString(12)}`,
    });
    return response.id;
  }

  /**
   * Send some message
   * @param {Object} data
   * @return {Promise<void>}
   */
  async message(data: { handle_id: number, body: object, jsep: object }): Promise<void> {
    await request(
      'message',
      Object.assign(
        {
          session_id: this.id,
        },
        data,
      ));
  }

  /**
   * Send trickle candidate
   * @param {{candidate: object}} data
   * @return {Promise<void>}
   */
  async trickle(data: { candidate: object }): Promise<void> {
    await request(
      'trickle',
      Object.assign(
        {
          session_id: this.id,
        },
        data,
      ));
  }

  /**
   * Send "hangup" request
   * @param {{handle_id: number}} data
   * @return {Promise<void>}
   */
  async hangup(data: { handle_id: number }): Promise<void> {
    await request(
      'hangup',
      Object.assign(
        {
          session_id: this.id,
        },
        data,
      ));
  }

  /**
   * Destroy the session
   * @return {Promise<void>}
   */
  async destroy(): Promise<void> {
    this.keepAliveInterval && global.clearInterval(this.keepAliveInterval);
    await request('destroy', {
      session_id: this.id,
    });
  }

  /**
   * Create new JanusSession instance, send "create" request
   * @return {Promise<JanusSession>}
   */
  static async create(): Promise<JanusSession> {
    const session = new JanusSession();
    await session.create();
    if (session.id) {
      sessions.set(session.id, session);
    }
    return session;
  }

  /**
   * Destroy the session by id
   * @param {number} id
   * @return {Promise<void>}
   */
  static async destroy(id: number): Promise<void> {
    const session = this.get(id);
    await session.destroy();
    sessions.delete(id);
  }

  /**
   * Getting JanusSession instance by id
   * @param {number} id
   * @return {JanusSession}
   */
  static get(id: number): JanusSession {
    const session = sessions.get(id);
    if (session) {
      return session;
    }
    throw new Error(`session ${id} not found`);
  }

}
