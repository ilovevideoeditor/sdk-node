# @ilovevideoeditor/sdk-node

Official Node.js / TypeScript SDK for iLoveVideoEditor — render videos programmatically with a cloud video API.

[![npm version](https://img.shields.io/npm/v/@ilovevideoeditor/sdk-node.svg)](https://www.npmjs.com/package/@ilovevideoeditor/sdk-node) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Docs](https://img.shields.io/badge/docs-ilovevideoeditor.com-blue)](https://ilovevideoeditor.com/docs/sdks) [![Run in Postman](https://run.pstmn.io/button.svg)](https://god.gw.postman.com/run-collection/56628364-3f13fc43-a1e0-489a-804a-dc0582999ddf?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D56628364-3f13fc43-a1e0-489a-804a-dc0582999ddf%26entityType%3Dcollection%26workspaceId%3Df6303c1d-8772-405a-8999-6b6077bd13a5)

[iLoveVideoEditor](https://ilovevideoeditor.com) is a cloud video rendering API: submit a JSON scene description (VideoJSON) or a template with variables, queue a render job, and download the resulting MP4/WebM when it completes. This package is the official typed client for Node.js and TypeScript — a zero-dependency ESM library that handles authentication, job queueing, polling, and signed download URLs for you.

## Features

- **Fully typed** — TypeScript models for every request and response (`RenderResult`, `Template`, `Workflow`, …)
- **Zero runtime dependencies** — built on the global `fetch` API; runs on Node.js 18+ and other modern JavaScript runtimes
- **API key or JWT auth** — `x-api-key` for server-side keys, bearer tokens for user-scoped endpoints
- **Queue + poll in one call** — `render()` and `renderTemplate()` submit a job, poll to completion, and return a download URL, with `onProgress` callbacks
- **Templates** — list public templates and render them with your own variables
- **Full REST surface** — renders, templates, tools, projects, assets, renditions, workflows, webhook subscriptions, billing, storage integrations, and API key management
- **Webhooks** — register `render.completed` / `render.failed` subscriptions and verify incoming signatures with the built-in HMAC-SHA256 helper
- **Timeouts & cancellation** — every method accepts an `AbortSignal` and a per-request `requestTimeoutMs`
- **Idempotent submissions** — optional idempotency keys on render endpoints

## Installation

```bash
npm install @ilovevideoeditor/sdk-node
# or
yarn add @ilovevideoeditor/sdk-node
# or
pnpm add @ilovevideoeditor/sdk-node
```

Requires **Node.js 18 or newer** (the SDK uses the global `fetch` API).

## Quick start

```ts
import { ILoveVideoEditorClient } from '@ilovevideoeditor/sdk-node';

const client = new ILoveVideoEditorClient({
  apiKey: process.env.ILOVEVIDEOEDITOR_API_KEY, // vf_live_...
});

// Submit a VideoJSON scene and wait for the render to finish
const result = await client.render(
  {
    name: 'Hello World',
    width: 1920,
    height: 1080,
    duration: 5,
    layers: [
      /* …your scene layers… */
    ],
  },
  {
    onProgress: (state) => console.log(`${state.status} — ${state.progress}%`),
  },
);

if (result.status === 'completed') {
  console.log('Download URL:', result.downloadUrl);
} else {
  console.error('Render failed:', result.error);
}
```

Render a template with variables instead of a raw scene:

```ts
const result = await client.renderTemplate('template-id', {
  variables: { title: 'Summer Sale', subtitle: 'Up to 50% off' },
});

console.log(result.downloadUrl);
```

## Authentication

Create an API key in your [iLoveVideoEditor dashboard](https://ilovevideoeditor.com) and pass it to the client. Live keys are prefixed with `vf_live_`. Keep the key out of source control — read it from an environment variable:

```ts
const client = new ILoveVideoEditorClient({
  apiKey: process.env.ILOVEVIDEOEDITOR_API_KEY,
  // Optional overrides:
  // baseUrl: 'https://api.ilovevideoeditor.com',
  // requestTimeoutMs: 30_000,
});
```

For user-scoped endpoints that do not accept API keys, pass a JWT access token instead: `new ILoveVideoEditorClient({ bearerToken })`.

## API reference

All methods are async, return typed results, and accept an optional final `options` argument with `signal` and `requestTimeoutMs`.

### Renders

| Method | Description |
| --- | --- |
| `queueRender(videoJSON, options?)` | Submit a VideoJSON payload, returns `{ jobId, status }` |
| `render(videoJSON, options?)` | Submit + poll to completion, returns `RenderResult` with `downloadUrl` |
| `getRender(jobId, options?)` | Get the status of a render job |
| `listRenders(options?)` | List recent renders for the authenticated user |
| `estimateRenderCost(videoJSON, options?)` | Estimate the credit cost of a payload without queueing |
| `cancelRender(jobId, options?)` | Cancel a job that has not started rendering yet |
| `getRenderDownloadUrl(jobId, options?)` | Get a direct download URL for a completed render |
| `downloadRender(jobId, options?)` | Follow the download redirect, returns the final CDN/signed URL |
| `refreshRenderUrl(jobId, options?)` | Refresh the signed download URL for a completed render |
| `trackRenderBandwidth(jobId, options?)` | Record bandwidth for a render preview served from the CDN |
| `getTier(options?)` | Current tier and credit balance |

### Templates

| Method | Description |
| --- | --- |
| `listTemplates(options?)` | List public templates |
| `getTemplate(id, options?)` | Get a single template by ID |
| `renderTemplate(id, request, options?)` | Compile a template with variables + poll to completion |
| `queueTemplateRender(id, request, options?)` | Queue a template render, returns `{ jobId, status }` |

### Tools, projects, assets, renditions

| Method | Description |
| --- | --- |
| `queueTool(toolId, request, options?)` / `processTool(toolId, request, options?)` | Submit a tool job (queue-only or poll to completion) |
| `getToolJob(jobId, options?)` / `downloadToolJob(jobId, options?)` | Tool job status and download URL |
| `listProjects` / `getProject` / `createProject` / `updateProject` / `patchProject` / `deleteProject` / `duplicateProject` / `batchDeleteProjects` / `getProjectStats` | Project CRUD |
| `listAssets` / `getAsset` / `uploadAsset` / `uploadAssetFile` / `uploadAssetDirect` / `registerAsset` / `createAssetUploadUrl` / `getAssetSignedUrl` / `proxyAsset` / `deleteAsset` / `batchDeleteAssets` | Asset management |
| `listRenditions` / `getRendition` / `getRenditionStats` / `cancelRendition` / `deleteRendition` / `batchDeleteRenditions` | Render history (renditions) |

### Webhooks

```ts
import { verifyWebhookSignature } from '@ilovevideoeditor/sdk-node';

// Manage subscriptions via the client:
await client.createWebhookSubscription({
  url: 'https://example.com/webhooks/ilve',
  events: ['render.completed', 'render.failed'],
});

// Verify incoming webhook requests (HMAC-SHA256, timing-safe):
const result = verifyWebhookSignature({
  payload: rawRequestBody, // string or Buffer
  signatureHeader: req.headers['x-ilve-signature'],
  secret: 'whsec_...',
});

if (!result.valid) {
  throw new Error(`Invalid webhook signature: ${result.error}`);
}
```

| Method | Description |
| --- | --- |
| `createWebhookSubscription(request, options?)` | Register a webhook endpoint |
| `listWebhookSubscriptions(options?)` | List active subscriptions |
| `deleteWebhookSubscription(id, options?)` | Remove a subscription |
| `verifyWebhookSignature(options)` | Verify the `X-ILVE-Signature` header of an incoming webhook |

### Workflows, billing, integrations, API keys

| Method | Description |
| --- | --- |
| `listWorkflows` / `createWorkflow` / `getWorkflow` / `updateWorkflow` / `deleteWorkflow` / `runWorkflow` / `listWorkflowRuns` / `getWorkflowRun` / `cancelWorkflowRun` / `retryWorkflowRun` / `retryWorkflowStep` / `skipWorkflowStep` / `listWorkflowStepTypes` | Multi-step automation workflows |
| `getBillingPrices` / `createCheckoutSession` / `cancelSubscription` / `getSubscription` / `getInvoices` / `getCredits` / `getUsage` | Billing and usage |
| `listIntegrations` / `createIntegration` / `updateIntegration` / `deleteIntegration` / `testIntegration` / `getDestination` / `setDestination` / `testDestination` / `deleteDestination` | Cloud storage destinations (S3, R2, B2, GCS, …) |
| `listApiKeys` / `createApiKey` / `deleteApiKey` | API key management |

### Errors

Every API failure throws an `ILoveVideoEditorError` with the HTTP `statusCode` and parsed `responseBody`:

```ts
import { ILoveVideoEditorError } from '@ilovevideoeditor/sdk-node';

try {
  await client.getRender('job-id');
} catch (err) {
  if (err instanceof ILoveVideoEditorError && err.statusCode === 404) {
    // job not found
  }
  throw err;
}
```

## Aborting / timeouts

All async methods accept an optional `AbortSignal` and a per-request timeout. Polling methods (`render`, `renderTemplate`, `processTool`) also accept `pollIntervalMs` and `maxPollTimeMs`:

```ts
const controller = new AbortController();

const result = await client.render(videoJSON, {
  signal: controller.signal,
  requestTimeoutMs: 60_000, // per HTTP request
  maxPollTimeMs: 600_000,   // total wait for the job (default 5 min)
  pollIntervalMs: 2_000,    // status poll interval (default 2 s)
});

// Cancel at any time:
controller.abort();
```

## Documentation

- Docs: [ilovevideoeditor.com/docs](https://ilovevideoeditor.com/docs)
- SDK guides: [ilovevideoeditor.com/docs/sdks](https://ilovevideoeditor.com/docs/sdks)
- API reference: [OpenAPI spec](https://ilovevideoeditor.com/docs/api/openapi.yaml) · [Postman collection](https://ilovevideoeditor.com/docs/api/postman-collection.json)
- npm: [npmjs.com/package/@ilovevideoeditor/sdk-node](https://www.npmjs.com/package/@ilovevideoeditor/sdk-node)

## Other official SDKs

- **Python**: [pypi.org/project/ilovevideoeditor-sdk](https://pypi.org/project/ilovevideoeditor-sdk/) — [github.com/ilovevideoeditor/sdk-python](https://github.com/ilovevideoeditor/sdk-python)
- **Ruby**: [rubygems.org/gems/ilovevideoeditor-sdk](https://rubygems.org/gems/ilovevideoeditor-sdk) — [github.com/ilovevideoeditor/sdk-ruby](https://github.com/ilovevideoeditor/sdk-ruby)
- **PHP**: [packagist.org/packages/ilovevideoeditor/sdk](https://packagist.org/packages/ilovevideoeditor/sdk) — [github.com/ilovevideoeditor/sdk-php](https://github.com/ilovevideoeditor/sdk-php)
- **Go**: [pkg.go.dev/github.com/ilovevideoeditor/sdk-go](https://pkg.go.dev/github.com/ilovevideoeditor/sdk-go) — [github.com/ilovevideoeditor/sdk-go](https://github.com/ilovevideoeditor/sdk-go)

## License

MIT — see [LICENSE](./LICENSE).
