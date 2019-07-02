import express from 'express';
import { json } from 'body-parser';
import cors from 'cors';
import { JanusSession, Command } from '../janus/session';

const logger = console;

/**
 * create HTTP server
 * @param {number} port
 */
export function create(port: number) {
  const app = express();

  app.use(json());
  app.use(cors());

  /**
   * Create the session command
   */
  app.post('/create', async (req: express.Request, res: express.Response) => {
    try {
      const session = await JanusSession.create();
      res.status(200).send(`${session.id}`);
    } catch (err) {
      logger.error(req.url, err.stack);
      res.status(500).send(err.message);
    }
  });

  /**
   * Destroy the session command
   */
  app.post('/destroy/:id/', async (req: express.Request, res: express.Response) => {
    try {
      const { id } = <{ id: string }>req.params;
      await JanusSession.destroy(parseInt(id, 10));
      res.status(200).end();
    } catch (err) {
      logger.error(req.url, err.stack);
      res.status(500).send(err.message);
    }
  });

  /**
   * Handle session  commands
   */
  app.post('/session/:id/:command/', async (req: express.Request, res: express.Response) => {
    try {
      const { id, command } = <{id: string, command: Command}>req.params;
      const session = JanusSession.get(parseInt(id, 10));
      const result = await session[command](req.body);
      res.status(200).send(`${result || ''}`);
    } catch (err) {
      logger.error(req.url, err.stack);
      res.status(500).send(err.message);
    }
  });

  app.listen(port, () => {
    logger.info('local http server running on port', port);
  });
}
