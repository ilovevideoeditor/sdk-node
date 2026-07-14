/**
 * @ilovevideoeditor/sdk-node — Official Node.js / TypeScript SDK
 *
 * A **zero-dependency** thin client for the iLoveVideoEditor REST API.
 * It handles authentication, JSON submission, polling, and signed-URL
 * retrieval so you can render videos from any JavaScript runtime
 * (Node.js 18+, Deno, Bun, Cloudflare Workers, etc.).
 *
 * @example
 * ```ts
 * import { ILoveVideoEditorClient } from '@ilovevideoeditor/sdk-node';
 *
 * const client = new ILoveVideoEditorClient({
 *   apiKey: 'vf_live_xxx',
 *   baseUrl: 'https://api.ilovevideoeditor.com',
 * });
 *
 * // Submit a VideoJSON payload (produced by your own code or stored template)
 * const result = await client.render(myVideoJSON, {
 *   onProgress: (state) => console.log(`${state.status} — ${state.progress}%`),
 * });
 *
 * if (result.status === 'completed') {
 *   console.log('Download URL:', result.downloadUrl);
 * }
 * ```
 */

export { ILoveVideoEditorClient } from './client.js';
export { ILoveVideoEditorError } from './errors.js';
export * from './types.js';
export { verifyWebhookSignature } from './webhooks.js';
