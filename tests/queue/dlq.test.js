const { createReviewDlqQueue, enqueueDeadLetter } = require('../../dist/queue/queue');
const { REVIEW_DLQ_NAME } = require('../../dist/queue/constants');

jest.mock('../../dist/queue/queue', () => {
  const actual = jest.requireActual('../../dist/queue/queue');
  return {
    ...actual,
    createReviewDlqQueue: jest.fn(() => ({
      add: jest.fn(),
    })),
  };
});

describe('dead-letter queue', () => {
  test('enqueueDeadLetter adds job to DLQ with expected name', async () => {
    const dlq = createReviewDlqQueue();

    const job = {
      job: {
        installationId: 1,
        owner: 'owner',
        repo: 'repo',
        pullNumber: 1,
        sha: 'abcdef',
      },
      error: 'Something went wrong',
    };

    await enqueueDeadLetter(dlq, job);

    expect(dlq.add).toHaveBeenCalledWith(
      REVIEW_DLQ_NAME,
      job,
      expect.objectContaining({
        removeOnComplete: 1000,
        removeOnFail: 1000,
      }),
    );
  });
});

