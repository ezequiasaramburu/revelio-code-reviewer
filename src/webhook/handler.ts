import { FastifyReply, FastifyRequest } from 'fastify';

export async function webhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const event = request.headers['x-github-event'];
  const delivery = request.headers['x-github-delivery'];

  request.log.info(
    { event, delivery, body: request.body },
    'Received GitHub webhook',
  );

  reply.code(204).send();
}

