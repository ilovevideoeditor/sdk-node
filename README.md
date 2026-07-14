# @ilovevideoeditor/sdk-node

Official Node.js / TypeScript SDK for the [iLoveVideoEditor](https://ilovevideoeditor.com) REST API.

## Installation

```bash
npm install @ilovevideoeditor/sdk-node
```

Requires Node.js 18+ (global `fetch`).

## Quick Start

```ts
import { ILoveVideoEditorClient } from '@ilovevideoeditor/sdk-node';

const client = new ILoveVideoEditorClient({ apiKey: 'vf_live_xxx' });

const result = await client.render(
  { name: 'Hello', layers: [...] },
  {
    onProgress: (state) => console.log(`${state.status} — ${state.progress}%`),
  },
);

console.log(result.downloadUrl);
```

## Methods

- `client.queueRender(videoJSON, options?)` → submit and return `{jobId, status}`
- `client.render(videoJSON, options?)` → submit + poll + return `RenderResult`
- `client.getRender(jobId, options?)` → get status
- `client.refreshUrl(jobId, options?)` → fresh download URL
- `client.listTemplates(options?)` → list public templates
- `client.getTemplate(id, options?)` → get single template

## Aborting / Timeouts

All async methods accept an optional `AbortSignal` and a per-request timeout:

```ts
const controller = new AbortController();
const result = await client.render(videoJSON, {
  signal: controller.signal,
  requestTimeoutMs: 60_000,
  maxPollTimeMs: 600_000,
});

// Cancel at any time:
controller.abort();
```

## License

MIT — see [LICENSE](./LICENSE).
