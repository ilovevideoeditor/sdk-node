import assert from 'node:assert';
import { describe, test } from 'node:test';
import { ILoveVideoEditorClient } from '../../src/index.js';

const baseUrl = process.env.SDK_TEST_BASE_URL ?? 'http://127.0.0.1:4010';
const apiKey = process.env.SDK_TEST_API_KEY ?? 'test-key';
const bearerToken = process.env.SDK_TEST_BEARER_TOKEN ?? 'test-token';

describe('SDK Node E2E', () => {
  const client = new ILoveVideoEditorClient({ apiKey, bearerToken, baseUrl });

  test('healthCheck returns a status string', async () => {
    const status = await client.healthCheck();
    assert.ok(typeof status.status === 'string');
    assert.ok(status.status.length > 0);
  });

  test('listTemplates returns an array', async () => {
    const templates = await client.listTemplates();
    assert.ok(Array.isArray(templates));
  });

  test('queueRender accepts a minimal VideoJSON payload', async () => {
    const videoJSON = {
      name: 'e2e-test',
      layers: [{ type: 'composition', width: 1920, height: 1080, fps: 30 }],
    };
    const job = await client.queueRender(videoJSON);
    assert.ok(job.jobId);
    assert.ok(job.status);
  });

  test('estimateRenderCost returns a cost estimate', async () => {
    const videoJSON = {
      name: 'e2e-test',
      layers: [{ type: 'composition', width: 1920, height: 1080, fps: 30 }],
    };
    const estimate = await client.estimateRenderCost(videoJSON);
    assert.ok(typeof estimate.cost === 'number');
    assert.ok(typeof estimate.estimatedDuration === 'number');
  });

  test('listProjects returns paginated response', async () => {
    const result = await client.listProjects({ page: 1, limit: 10 });
    assert.ok(Array.isArray(result.projects));
    assert.ok(typeof result.total === 'number');
    assert.ok(typeof result.page === 'number');
  });
});
