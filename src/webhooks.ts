import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyWebhookOptions {
  /** Raw request body as a string or Buffer. */
  payload: string | Buffer;
  /** Value of the `X-ILVE-Signature` header. */
  signatureHeader: string;
  /** Signing secret (e.g. `whsec_...`). */
  secret: string;
  /** Optional maximum age in seconds (default: 300). */
  maxAgeSeconds?: number;
  /** Optional current timestamp in seconds (default: Date.now() / 1000). */
  nowSeconds?: number;
}

export interface WebhookVerificationResult {
  valid: boolean;
  event?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Verify the signature of an incoming iLoveVideoEditor webhook.
 *
 * The signature header format is:
 *   t=<unix seconds>,v1=<hex HMAC-SHA256(`${t}.${rawBody}`, secret)>
 *
 * Example:
 *   const result = verifyWebhookSignature({
 *     payload: rawBody,
 *     signatureHeader: request.headers['x-ilve-signature'],
 *     secret: 'whsec_...',
 *   });
 */
export function verifyWebhookSignature(
  options: VerifyWebhookOptions,
): WebhookVerificationResult {
  const {
    payload,
    signatureHeader,
    secret,
    maxAgeSeconds = 300,
    nowSeconds = Date.now() / 1000,
  } = options;

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valid: false, error: 'Missing X-ILVE-Signature header' };
  }

  const parts = signatureHeader.split(',');
  const tsPart = parts.find((p) => p.startsWith('t='));
  const sigPart = parts.find((p) => p.startsWith('v1='));

  if (!tsPart || !sigPart) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const timestamp = Number.parseInt(tsPart.slice(2), 10);
  if (!Number.isFinite(timestamp)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  if (Math.abs(nowSeconds - timestamp) > maxAgeSeconds) {
    return {
      valid: false,
      error: 'Signature timestamp outside allowed window',
    };
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const provided = sigPart.slice(3);

  if (provided.length !== expected.length) {
    return { valid: false, error: 'Signature length mismatch' };
  }

  const providedBuffer = Buffer.from(provided, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: 'Signature encoding mismatch' };
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true, timestamp };
}
