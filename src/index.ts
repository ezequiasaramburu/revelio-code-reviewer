import fastify, { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { webhookHandler } from './webhook/handler';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

export async function buildServer(): Promise<FastifyInstance> {
  const app = fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/webhook', async (request, reply) => {
    await webhookHandler(request, reply);
  });

  return app;
}

async function main(): Promise<void> {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info({ port: PORT }, 'Revelio server listening');
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

