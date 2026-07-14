import { ILoveVideoEditorError } from './errors.js';
import type {
  ApiKey,
  ApiKeyListResponse,
  ApiKeyWithSecret,
  Asset,
  AssetListResponse,
  AssetSignedUrlResponse,
  AssetUploadUrlRequest,
  AssetUploadUrlResponse,
  BatchDeleteManyResponse,
  BatchDeleteResponse,
  BillingPrices,
  CancelRenderResponse,
  CancelRenditionResponse,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  ClientOptions,
  CreateApiKeyRequest,
  CreateIntegrationRequest,
  CreateProjectRequest,
  CreateToolJobRequest,
  CreateWorkflowRequest,
  CreditsResponse,
  Destination,
  DetailedHealthStatus,
  DuplicateProjectResponse,
  HealthStatus,
  Integration,
  IntegrationListResponse,
  IntegrationResponse,
  InvoicesResponse,
  PaginationOptions,
  PatchProjectRequest,
  PollOptions,
  ProgressInfo,
  Project,
  ProjectListResponse,
  ProjectStatsResponse,
  ProjectWithRendition,
  QueuedRender,
  QueuedToolJob,
  QueueRenderRequest,
  RefreshUrlResponse,
  RegisterAssetRequest,
  RenderCostEstimate,
  RenderDownloadUrl,
  RenderListItem,
  RenderOutput,
  RenderResult,
  RenderTemplateRequest,
  Rendition,
  RenditionListResponse,
  RenditionStats,
  RequestOptions,
  RunWorkflowRequest,
  SetDestinationRequest,
  StepTypesResponse,
  SubscriptionInfo,
  Template,
  TemplateSummary,
  TierInfo,
  ToolJobResult,
  TrackBandwidthResponse,
  UpdateIntegrationRequest,
  UpdateProjectRequest,
  UpdateWorkflowRequest,
  UsageResponse,
  VideoJSON,
  WebhookEvent,
  WebhookSubscription,
  WebhookSubscriptionCreate,
  WebhookSubscriptionListResponse,
  Workflow,
  WorkflowDefinition,
  WorkflowDetailResponse,
  WorkflowListResponse,
  WorkflowRun,
  WorkflowRunDetailResponse,
  WorkflowRunListResponse,
  WorkflowRunStep,
  WorkflowStepType,
} from './types.js';

/** Minimal delay helper that respects an AbortSignal. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function encodePath(id: string): string {
  return encodeURIComponent(id);
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== undefined,
  );
  if (entries.length === 0) return '';
  const qs = new URLSearchParams();
  for (const [key, value] of entries) {
    qs.set(key, String(value));
  }
  return `?${qs.toString()}`;
}

function normalizeRenderResult(state: RenderResult): RenderResult {
  if (state.status === 'completed' && !state.progress) {
    state.progress = { done: 1, total: 1, percent: 100 };
  }
  return state;
}

/**
 * iLoveVideoEditor API client.
 *
 * Supports both API key authentication (`x-api-key`) and JWT bearer tokens.
 * Most methods return native Promises and use the global `fetch` API, keeping
 * the package dependency-free.
 */
export class ILoveVideoEditorClient {
  private readonly apiKey?: string;
  private readonly bearerToken?: string;
  private readonly baseUrl: string;
  private readonly defaultRequestTimeoutMs: number;

  constructor(options: ClientOptions) {
    if (!options.apiKey && !options.bearerToken) {
      throw new ILoveVideoEditorError(
        'Either apiKey or bearerToken is required',
      );
    }
    this.apiKey = options.apiKey;
    this.bearerToken = options.bearerToken;
    this.baseUrl =
      options.baseUrl?.replace(/\/$/, '') ?? 'https://api.ilovevideoeditor.com';
    this.defaultRequestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  }

  /** Perform an authenticated request and parse JSON. */
  private async request<T>(
    path: string,
    init: RequestInit = {},
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options.signal && options.signal !== timeoutSignal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const headers: Record<string, string> = {
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      ...(this.bearerToken
        ? { Authorization: `Bearer ${this.bearerToken}` }
        : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...init, headers, signal });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ILoveVideoEditorError(`Request failed: ${message}`);
    }

    let body: unknown;
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    if (!res.ok) {
      const message =
        typeof body === 'object' && body && 'error' in body
          ? String((body as Record<string, unknown>).error)
          : `HTTP ${res.status}`;
      throw new ILoveVideoEditorError(message, res.status, body);
    }
    return body as T;
  }

  /** Build request headers including an optional idempotency key. */
  private idempotencyHeaders(
    idempotencyKey?: string,
  ): Record<string, string> | undefined {
    if (!idempotencyKey) return undefined;
    return { 'Idempotency-Key': idempotencyKey };
  }

  // =========================================================================
  // Health
  // =========================================================================

  /** Public health check. */
  async healthCheck(options?: RequestOptions): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health', { method: 'GET' }, options);
  }

  /** Detailed health check including dependency latencies (API key required). */
  async healthCheckDetailed(
    options?: RequestOptions,
  ): Promise<DetailedHealthStatus> {
    return this.request<DetailedHealthStatus>(
      '/health/detailed',
      { method: 'GET' },
      options,
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  /**
   * Submit a VideoJSON payload and return the queued job ID.
   * Use this when you want to manage polling yourself.
   */
  async queueRender(
    videoJSON: VideoJSON,
    options?: RequestOptions & {
      webhookUrl?: string;
      projectId?: string;
      idempotencyKey?: string;
    },
  ): Promise<QueuedRender> {
    const body: QueueRenderRequest = { videoJSON };
    if (options?.webhookUrl) body.webhookUrl = options.webhookUrl;
    if (options?.projectId) body.projectId = options.projectId;
    return this.request<QueuedRender>(
      '/v1/render',
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: this.idempotencyHeaders(options?.idempotencyKey),
      },
      options,
    );
  }

  /**
   * Submit a VideoJSON payload and poll until the render completes.
   */
  async render(
    videoJSON: VideoJSON,
    options?: PollOptions & {
      webhookUrl?: string;
      projectId?: string;
      idempotencyKey?: string;
      onProgress?: (state: ProgressInfo) => void;
    },
  ): Promise<RenderResult> {
    const {
      pollIntervalMs = 2000,
      maxPollTimeMs = 300_000,
      onProgress,
      signal,
    } = options ?? {};

    if (signal?.aborted) {
      throw signal.reason;
    }

    const { jobId } = await this.queueRender(videoJSON, {
      ...options,
      signal,
      requestTimeoutMs: options?.requestTimeoutMs,
    });

    const pollStart = Date.now();
    let lastState: RenderResult | undefined;

    while (Date.now() - pollStart < maxPollTimeMs) {
      if (signal?.aborted) {
        throw signal.reason;
      }

      const state = await this.getRender(jobId, {
        signal,
        requestTimeoutMs: options?.requestTimeoutMs,
      });

      lastState = normalizeRenderResult(state);
      onProgress?.({
        jobId,
        status: lastState.status,
        progress: lastState.progress?.percent ?? 0,
      });

      if (state.status === 'completed') {
        const refresh = await this.refreshRenderUrl(jobId, {
          signal,
          requestTimeoutMs: options?.requestTimeoutMs,
        });
        lastState.downloadUrl = refresh.downloadUrl;
        return lastState;
      }

      if (state.status === 'failed' || state.status === 'cancelled') {
        return lastState;
      }

      await delay(pollIntervalMs, signal);
    }

    throw new ILoveVideoEditorError(
      `Render timed out after ${maxPollTimeMs}ms. Last status: ${lastState?.status ?? 'unknown'}`,
    );
  }

  /** Get the current status of a render job. */
  async getRender(id: string, options?: RequestOptions): Promise<RenderResult> {
    return this.request<RenderResult>(
      `/v1/render/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
  }

  /** List recent renders for the authenticated user. */
  async listRenders(
    options?: RequestOptions & { limit?: number },
  ): Promise<RenderListItem[]> {
    const qs = buildQuery({ limit: options?.limit });
    return this.request<RenderListItem[]>(
      `/v1/render${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Estimate the credit cost for a VideoJSON payload without queueing. */
  async estimateRenderCost(
    videoJSON: VideoJSON,
    options?: RequestOptions,
  ): Promise<RenderCostEstimate> {
    return this.request<RenderCostEstimate>(
      '/v1/render/cost',
      {
        method: 'POST',
        body: JSON.stringify({ videoJSON }),
      },
      options,
    );
  }

  /** Cancel a render job that has not started rendering yet. */
  async cancelRender(
    id: string,
    options?: RequestOptions,
  ): Promise<CancelRenderResponse> {
    return this.request<CancelRenderResponse>(
      `/v1/render/${encodePath(id)}/cancel`,
      { method: 'POST' },
      options,
    );
  }

  /** Get a direct download URL for a completed render. */
  async getRenderDownloadUrl(
    id: string,
    options?: RequestOptions,
  ): Promise<RenderDownloadUrl> {
    return this.request<RenderDownloadUrl>(
      `/v1/render/${encodePath(id)}/download-url`,
      { method: 'GET' },
      options,
    );
  }

  /**
   * Download the result of a completed render.
   * Returns the final redirect URL (usually a CDN or signed URL).
   */
  async downloadRender(
    id: string,
    options?: RequestOptions,
  ): Promise<{ url: string }> {
    const url = `${this.baseUrl}/v1/render/${encodePath(id)}/download`;
    const timeoutMs = options?.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options?.signal && options.signal !== timeoutSignal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
        ...(this.bearerToken
          ? { Authorization: `Bearer ${this.bearerToken}` }
          : {}),
      },
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ILoveVideoEditorError(
        body || `HTTP ${res.status}`,
        res.status,
        body,
      );
    }

    return { url: res.url };
  }

  /** Refresh the signed download URL for a completed render. */
  async refreshRenderUrl(
    id: string,
    options?: RequestOptions,
  ): Promise<RefreshUrlResponse> {
    return this.request<RefreshUrlResponse>(
      `/v1/render/${encodePath(id)}/refresh-url`,
      { method: 'POST' },
      options,
    );
  }

  /** Record bandwidth for a render preview served directly from the CDN. */
  async trackRenderBandwidth(
    id: string,
    options?: RequestOptions,
  ): Promise<TrackBandwidthResponse> {
    return this.request<TrackBandwidthResponse>(
      `/v1/render/${encodePath(id)}/track-bandwidth`,
      { method: 'POST' },
      options,
    );
  }

  /** Get the authenticated user's current tier and credit balance. */
  async getTier(options?: RequestOptions): Promise<TierInfo> {
    return this.request<TierInfo>(
      '/v1/render/tier',
      { method: 'GET' },
      options,
    );
  }

  // =========================================================================
  // Templates
  // =========================================================================

  /** List all public templates. */
  async listTemplates(options?: RequestOptions): Promise<TemplateSummary[]> {
    const res = await this.request<{ templates: TemplateSummary[] }>(
      '/v1/templates',
      { method: 'GET' },
      options,
    );
    return res.templates;
  }

  /** Get a single template by ID. */
  async getTemplate(id: string, options?: RequestOptions): Promise<Template> {
    const res = await this.request<{ template: Template }>(
      `/v1/templates/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
    return res.template;
  }

  /**
   * Compile a template with variables and poll until the render completes.
   */
  async renderTemplate(
    id: string,
    request: RenderTemplateRequest,
    options?: PollOptions & {
      idempotencyKey?: string;
      onProgress?: (state: ProgressInfo) => void;
    },
  ): Promise<RenderResult> {
    const {
      pollIntervalMs = 2000,
      maxPollTimeMs = 300_000,
      onProgress,
      signal,
    } = options ?? {};

    if (signal?.aborted) {
      throw signal.reason;
    }

    const { jobId } = await this.request<QueuedRender>(
      `/v1/templates/${encodePath(id)}/render`,
      {
        method: 'POST',
        body: JSON.stringify(request),
        headers: this.idempotencyHeaders(options?.idempotencyKey),
      },
      { signal, requestTimeoutMs: options?.requestTimeoutMs },
    );

    const pollStart = Date.now();
    let lastState: RenderResult | undefined;

    while (Date.now() - pollStart < maxPollTimeMs) {
      if (signal?.aborted) {
        throw signal.reason;
      }

      const state = await this.getRender(jobId, {
        signal,
        requestTimeoutMs: options?.requestTimeoutMs,
      });
      lastState = normalizeRenderResult(state);
      onProgress?.({
        jobId,
        status: lastState.status,
        progress: lastState.progress?.percent ?? 0,
      });

      if (state.status === 'completed') {
        const refresh = await this.refreshRenderUrl(jobId, {
          signal,
          requestTimeoutMs: options?.requestTimeoutMs,
        });
        lastState.downloadUrl = refresh.downloadUrl;
        return lastState;
      }

      if (state.status === 'failed' || state.status === 'cancelled') {
        return lastState;
      }

      await delay(pollIntervalMs, signal);
    }

    throw new ILoveVideoEditorError(
      `Template render timed out after ${maxPollTimeMs}ms. Last status: ${lastState?.status ?? 'unknown'}`,
    );
  }

  /** Queue a template render and return the job ID. */
  async queueTemplateRender(
    id: string,
    request: RenderTemplateRequest,
    options?: RequestOptions & { idempotencyKey?: string },
  ): Promise<QueuedRender> {
    return this.request<QueuedRender>(
      `/v1/templates/${encodePath(id)}/render`,
      {
        method: 'POST',
        body: JSON.stringify(request),
        headers: this.idempotencyHeaders(options?.idempotencyKey),
      },
      options,
    );
  }

  // =========================================================================
  // Tools
  // =========================================================================

  /**
   * Submit a tool job and return the queued job ID.
   */
  async queueTool(
    toolId: string,
    request: CreateToolJobRequest,
    options?: RequestOptions,
  ): Promise<QueuedToolJob> {
    return this.request<QueuedToolJob>(
      `/v1/tools/${encodePath(toolId)}/jobs`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      options,
    );
  }

  /**
   * Submit a tool job and poll until it completes.
   */
  async processTool(
    toolId: string,
    request: CreateToolJobRequest,
    options?: PollOptions & { onProgress?: (state: ProgressInfo) => void },
  ): Promise<ToolJobResult> {
    const {
      pollIntervalMs = 2000,
      maxPollTimeMs = 300_000,
      onProgress,
      signal,
    } = options ?? {};

    if (signal?.aborted) {
      throw signal.reason;
    }

    const { jobId } = await this.queueTool(toolId, request, {
      signal,
      requestTimeoutMs: options?.requestTimeoutMs,
    });

    const pollStart = Date.now();
    let lastState: ToolJobResult | undefined;

    while (Date.now() - pollStart < maxPollTimeMs) {
      if (signal?.aborted) {
        throw signal.reason;
      }

      const state = await this.getToolJob(jobId, {
        signal,
        requestTimeoutMs: options?.requestTimeoutMs,
      });
      lastState = state;
      onProgress?.({
        jobId,
        status: state.status,
        progress: state.progress?.percent ?? 0,
      });

      if (state.status === 'completed' || state.status === 'failed') {
        return state;
      }

      await delay(pollIntervalMs, signal);
    }

    throw new ILoveVideoEditorError(
      `Tool job timed out after ${maxPollTimeMs}ms. Last status: ${lastState?.status ?? 'unknown'}`,
    );
  }

  /** Get the current status of a tool job. */
  async getToolJob(
    id: string,
    options?: RequestOptions,
  ): Promise<ToolJobResult> {
    return this.request<ToolJobResult>(
      `/v1/tools/jobs/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
  }

  /**
   * Download the result of a completed tool job.
   * Returns the final redirect URL (usually a CDN or signed URL).
   */
  async downloadToolJob(
    id: string,
    options?: RequestOptions,
  ): Promise<{ url: string }> {
    const url = `${this.baseUrl}/v1/tools/jobs/${encodePath(id)}/download`;
    const timeoutMs = options?.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options?.signal && options.signal !== timeoutSignal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
        ...(this.bearerToken
          ? { Authorization: `Bearer ${this.bearerToken}` }
          : {}),
      },
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ILoveVideoEditorError(
        body || `HTTP ${res.status}`,
        res.status,
        body,
      );
    }

    return { url: res.url };
  }

  // =========================================================================
  // Projects
  // =========================================================================

  /** List projects for the authenticated user. */
  async listProjects(
    options?: PaginationOptions,
  ): Promise<ProjectListResponse> {
    const qs = buildQuery({
      page: options?.page,
      limit: options?.limit,
      search: options?.search,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    });
    return this.request<ProjectListResponse>(
      `/v1/projects${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Total project count for the authenticated user. */
  async getProjectStats(
    options?: RequestOptions,
  ): Promise<ProjectStatsResponse> {
    return this.request<ProjectStatsResponse>(
      '/v1/projects/stats',
      { method: 'GET' },
      options,
    );
  }

  /** Create a new project. */
  async createProject(
    request: CreateProjectRequest,
    options?: RequestOptions,
  ): Promise<Project> {
    const res = await this.request<{ project: Project }>(
      '/v1/projects',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
    return res.project;
  }

  /** Get a project by ID, including the most recent rendition. */
  async getProject(
    id: string,
    options?: RequestOptions,
  ): Promise<ProjectWithRendition> {
    return this.request<ProjectWithRendition>(
      `/v1/projects/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
  }

  /** Fully replace a project. */
  async updateProject(
    id: string,
    request: UpdateProjectRequest,
    options?: RequestOptions,
  ): Promise<Project> {
    const res = await this.request<{ project: Project }>(
      `/v1/projects/${encodePath(id)}`,
      { method: 'PUT', body: JSON.stringify(request) },
      options,
    );
    return res.project;
  }

  /** Partially update a project (supports base64 thumbnail/sprite upload). */
  async patchProject(
    id: string,
    request: PatchProjectRequest,
    options?: RequestOptions,
  ): Promise<Project> {
    const res = await this.request<{ project: Project }>(
      `/v1/projects/${encodePath(id)}`,
      { method: 'PATCH', body: JSON.stringify(request) },
      options,
    );
    return res.project;
  }

  /** Delete a project. */
  async deleteProject(
    id: string,
    options?: RequestOptions,
  ): Promise<BatchDeleteResponse> {
    return this.request<BatchDeleteResponse>(
      `/v1/projects/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  /** Duplicate a project. */
  async duplicateProject(
    id: string,
    options?: RequestOptions,
  ): Promise<Project> {
    const res = await this.request<DuplicateProjectResponse>(
      `/v1/projects/${encodePath(id)}/duplicate`,
      { method: 'POST' },
      options,
    );
    return res.project;
  }

  /** Bulk delete projects. */
  async batchDeleteProjects(
    ids: string[],
    options?: RequestOptions,
  ): Promise<BatchDeleteManyResponse> {
    return this.request<BatchDeleteManyResponse>(
      '/v1/projects/batch-delete',
      { method: 'POST', body: JSON.stringify({ ids }) },
      options,
    );
  }

  // =========================================================================
  // Assets
  // =========================================================================

  /** Request a server-side upload URL for a new asset. */
  async createAssetUploadUrl(
    request: AssetUploadUrlRequest,
    type: 'image' | 'video' | 'audio' | 'font',
    options?: RequestOptions,
  ): Promise<AssetUploadUrlResponse> {
    return this.request<AssetUploadUrlResponse>(
      '/v1/assets/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({ ...request, type }),
      },
      options,
    );
  }

  /**
   * Upload raw file bytes to the URL returned by `createAssetUploadUrl`.
   * Most users should call `uploadAsset()` instead.
   */
  async uploadAssetFile(
    uploadUrl: string,
    file: Blob | Buffer | ReadableStream<Uint8Array>,
    contentType: string,
    options?: RequestOptions,
  ): Promise<void> {
    const timeoutMs = options?.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options?.signal && options.signal !== timeoutSignal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': contentType },
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ILoveVideoEditorError(
        body || `HTTP ${res.status}`,
        res.status,
        body,
      );
    }
  }

  /**
   * Upload raw file bytes directly to the server-side asset upload endpoint.
   * Most users should call `uploadAsset()` instead, which handles signed URLs.
   */
  async uploadAssetDirect(
    id: string,
    file: Blob | Buffer | ReadableStream<Uint8Array>,
    contentType: string,
    options?: RequestOptions,
  ): Promise<void> {
    const url = `${this.baseUrl}/v1/assets/${encodePath(id)}/upload`;
    const timeoutMs = options?.requestTimeoutMs ?? this.defaultRequestTimeoutMs;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options?.signal && options.signal !== timeoutSignal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

    const res = await fetch(url, {
      method: 'POST',
      body: file,
      headers: {
        'Content-Type': contentType,
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
        ...(this.bearerToken
          ? { Authorization: `Bearer ${this.bearerToken}` }
          : {}),
      },
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ILoveVideoEditorError(
        body || `HTTP ${res.status}`,
        res.status,
        body,
      );
    }
  }

  /**
   * High-level helper: request upload URL, upload file bytes, and register the asset.
   */
  async uploadAsset(
    file: Blob | Buffer | ReadableStream<Uint8Array>,
    options: {
      filename: string;
      contentType: string;
      type: 'image' | 'video' | 'audio' | 'font';
      size?: number;
      duration?: number;
      width?: number;
      height?: number;
    } & RequestOptions,
  ): Promise<Asset> {
    const upload = await this.createAssetUploadUrl(
      { filename: options.filename, contentType: options.contentType },
      options.type,
      options,
    );

    await this.uploadAssetFile(
      upload.uploadUrl,
      file,
      options.contentType,
      options,
    );

    return this.registerAsset(
      {
        id: upload.assetId,
        name: options.filename,
        type: options.type,
        contentType: options.contentType,
        size: options.size,
        storage_key: upload.path,
        duration: options.duration,
        width: options.width,
        height: options.height,
      },
      options,
    );
  }

  /** Register an asset after it has been uploaded to storage. */
  async registerAsset(
    request: RegisterAssetRequest,
    options?: RequestOptions,
  ): Promise<Asset> {
    const res = await this.request<{ asset: Asset }>(
      '/v1/assets',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
    return res.asset;
  }

  /** List assets in the current workspace. */
  async listAssets(
    options?: PaginationOptions & {
      type?: 'image' | 'video' | 'audio' | 'font';
    },
  ): Promise<AssetListResponse> {
    const qs = buildQuery({
      page: options?.page,
      limit: options?.limit,
      search: options?.search,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      type: options?.type,
    });
    return this.request<AssetListResponse>(
      `/v1/assets${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Get a single asset. */
  async getAsset(id: string, options?: RequestOptions): Promise<Asset> {
    const res = await this.request<{ asset: Asset }>(
      `/v1/assets/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
    return res.asset;
  }

  /** Get a public CDN URL for a stored asset. */
  async getAssetSignedUrl(
    id: string,
    options?: RequestOptions,
  ): Promise<string> {
    const res = await this.request<AssetSignedUrlResponse>(
      `/v1/assets/${encodePath(id)}/signed-url`,
      { method: 'GET' },
      options,
    );
    return res.signedUrl;
  }

  /** Get a proxied / transformed URL for a stored asset. */
  async proxyAsset(id: string, options?: RequestOptions): Promise<string> {
    const res = await this.request<AssetSignedUrlResponse>(
      `/v1/assets/${encodePath(id)}/proxy`,
      { method: 'GET' },
      options,
    );
    return res.signedUrl;
  }

  /** Delete an asset and its storage object. */
  async deleteAsset(
    id: string,
    options?: RequestOptions,
  ): Promise<BatchDeleteResponse> {
    return this.request<BatchDeleteResponse>(
      `/v1/assets/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  /** Bulk delete assets. */
  async batchDeleteAssets(
    ids: string[],
    options?: RequestOptions,
  ): Promise<BatchDeleteManyResponse> {
    return this.request<BatchDeleteManyResponse>(
      '/v1/assets/batch-delete',
      { method: 'POST', body: JSON.stringify({ ids }) },
      options,
    );
  }

  // =========================================================================
  // Renditions
  // =========================================================================

  /** List render history for the authenticated user. */
  async listRenditions(
    options?: PaginationOptions & {
      status?: string;
      projectId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<RenditionListResponse> {
    const qs = buildQuery({
      page: options?.page,
      limit: options?.limit,
      status: options?.status,
      projectId: options?.projectId,
      from: options?.from,
      to: options?.to,
      search: options?.search,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    });
    return this.request<RenditionListResponse>(
      `/v1/renditions${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Get a single rendition by ID. */
  async getRendition(id: string, options?: RequestOptions): Promise<Rendition> {
    const res = await this.request<{ rendition: Rendition }>(
      `/v1/renditions/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
    return res.rendition;
  }

  /** Cancel a rendition by ID. */
  async cancelRendition(
    id: string,
    options?: RequestOptions,
  ): Promise<CancelRenditionResponse> {
    return this.request<CancelRenditionResponse>(
      `/v1/renditions/${encodePath(id)}/cancel`,
      { method: 'POST' },
      options,
    );
  }

  /** Delete a rendition by ID. */
  async deleteRendition(
    id: string,
    options?: RequestOptions,
  ): Promise<BatchDeleteResponse> {
    return this.request<BatchDeleteResponse>(
      `/v1/renditions/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  /** Bulk delete renditions. */
  async batchDeleteRenditions(
    ids: string[],
    options?: RequestOptions,
  ): Promise<BatchDeleteManyResponse> {
    return this.request<BatchDeleteManyResponse>(
      '/v1/renditions/batch-delete',
      { method: 'POST', body: JSON.stringify({ ids }) },
      options,
    );
  }

  /** Aggregate rendition stats for the authenticated user. */
  async getRenditionStats(options?: RequestOptions): Promise<RenditionStats> {
    return this.request<RenditionStats>(
      '/v1/renditions/stats',
      { method: 'GET' },
      options,
    );
  }

  // =========================================================================
  // Webhooks
  // =========================================================================

  /** Create a webhook subscription for render lifecycle events. */
  async createWebhookSubscription(
    request: WebhookSubscriptionCreate,
    options?: RequestOptions,
  ): Promise<WebhookSubscription> {
    return this.request<WebhookSubscription>(
      '/v1/webhooks',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
  }

  /** List active webhook subscriptions. */
  async listWebhookSubscriptions(
    options?: RequestOptions,
  ): Promise<WebhookSubscription[]> {
    const res = await this.request<WebhookSubscriptionListResponse>(
      '/v1/webhooks',
      { method: 'GET' },
      options,
    );
    return res.subscriptions;
  }

  /** Revoke a webhook subscription. */
  async deleteWebhookSubscription(
    id: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/webhooks/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  // =========================================================================
  // Workflows
  // =========================================================================

  /** List available workflow step types. */
  async listWorkflowStepTypes(
    options?: RequestOptions,
  ): Promise<StepTypesResponse> {
    return this.request<StepTypesResponse>(
      '/v1/workflows/step-types',
      { method: 'GET' },
      options,
    );
  }

  /** List workflows in the current workspace. */
  async listWorkflows(
    options?: PaginationOptions,
  ): Promise<WorkflowListResponse> {
    const qs = buildQuery({
      page: options?.page,
      limit: options?.limit,
    });
    return this.request<WorkflowListResponse>(
      `/v1/workflows${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Create a workflow. */
  async createWorkflow(
    request: CreateWorkflowRequest,
    options?: RequestOptions,
  ): Promise<Workflow> {
    const res = await this.request<{ workflow: Workflow }>(
      '/v1/workflows',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
    return res.workflow;
  }

  /** Get a workflow by ID, including recent runs. */
  async getWorkflow(
    id: string,
    options?: RequestOptions,
  ): Promise<WorkflowDetailResponse> {
    return this.request<WorkflowDetailResponse>(
      `/v1/workflows/${encodePath(id)}`,
      { method: 'GET' },
      options,
    );
  }

  /** Update a workflow. */
  async updateWorkflow(
    id: string,
    request: UpdateWorkflowRequest,
    options?: RequestOptions,
  ): Promise<Workflow> {
    const res = await this.request<{ workflow: Workflow }>(
      `/v1/workflows/${encodePath(id)}`,
      { method: 'PUT', body: JSON.stringify(request) },
      options,
    );
    return res.workflow;
  }

  /** Delete a workflow. */
  async deleteWorkflow(
    id: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/workflows/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  /** Trigger a workflow run. */
  async runWorkflow(
    id: string,
    request?: RunWorkflowRequest,
    options?: RequestOptions,
  ): Promise<WorkflowRun> {
    const res = await this.request<{ run: WorkflowRun }>(
      `/v1/workflows/${encodePath(id)}/run`,
      { method: 'POST', body: JSON.stringify(request ?? {}) },
      options,
    );
    return res.run;
  }

  /** List runs for a workflow. */
  async listWorkflowRuns(
    id: string,
    options?: PaginationOptions,
  ): Promise<WorkflowRunListResponse> {
    const qs = buildQuery({
      page: options?.page,
      limit: options?.limit,
    });
    return this.request<WorkflowRunListResponse>(
      `/v1/workflows/${encodePath(id)}/runs${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Get a single workflow run with its steps. */
  async getWorkflowRun(
    runId: string,
    options?: RequestOptions,
  ): Promise<WorkflowRunDetailResponse> {
    return this.request<WorkflowRunDetailResponse>(
      `/v1/workflows/runs/${encodePath(runId)}`,
      { method: 'GET' },
      options,
    );
  }

  /** Cancel a running workflow run. */
  async cancelWorkflowRun(
    runId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/workflows/runs/${encodePath(runId)}/cancel`,
      { method: 'POST' },
      options,
    );
  }

  /** Retry a failed or terminal workflow run (creates a new run). */
  async retryWorkflowRun(
    runId: string,
    options?: RequestOptions,
  ): Promise<WorkflowRun> {
    const res = await this.request<{ run: WorkflowRun }>(
      `/v1/workflows/runs/${encodePath(runId)}/retry`,
      { method: 'POST' },
      options,
    );
    return res.run;
  }

  /** Retry a single failed workflow step. */
  async retryWorkflowStep(
    runId: string,
    stepId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/workflows/runs/${encodePath(runId)}/steps/${encodePath(stepId)}/retry`,
      { method: 'POST' },
      options,
    );
  }

  /** Skip a single workflow step. */
  async skipWorkflowStep(
    runId: string,
    stepId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/workflows/runs/${encodePath(runId)}/steps/${encodePath(stepId)}/skip`,
      { method: 'POST' },
      options,
    );
  }

  // =========================================================================
  // Billing
  // =========================================================================

  /** Get available Dodo product IDs for tiers and credit packs. */
  async getBillingPrices(options?: RequestOptions): Promise<BillingPrices> {
    return this.request<BillingPrices>(
      '/billing/prices',
      { method: 'GET' },
      options,
    );
  }

  /** Create a Dodo checkout session for a subscription or credit purchase. */
  async createCheckoutSession(
    request: CheckoutSessionRequest,
    options?: RequestOptions,
  ): Promise<CheckoutSessionResponse> {
    return this.request<CheckoutSessionResponse>(
      '/billing/checkout',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
  }

  /** Cancel the current workspace subscription at the next billing date. */
  async cancelSubscription(
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      '/billing/cancel',
      { method: 'POST' },
      options,
    );
  }

  /** Get workspace invoices and subscription summary. */
  async getInvoices(options?: RequestOptions): Promise<InvoicesResponse> {
    return this.request<InvoicesResponse>(
      '/billing/invoices',
      { method: 'GET' },
      options,
    );
  }

  /** Get workspace credit balance, usage, and transaction history. */
  async getCredits(options?: RequestOptions): Promise<CreditsResponse> {
    return this.request<CreditsResponse>(
      '/billing/credits',
      { method: 'GET' },
      options,
    );
  }

  /** Get workspace usage log history. */
  async getUsage(
    options?: RequestOptions & {
      limit?: number;
      type?: 'storage' | 'bandwidth';
    },
  ): Promise<UsageResponse> {
    const qs = buildQuery({
      limit: options?.limit,
      type: options?.type,
    });
    return this.request<UsageResponse>(
      `/billing/usage${qs}`,
      { method: 'GET' },
      options,
    );
  }

  /** Get workspace subscription summary. */
  async getSubscription(options?: RequestOptions): Promise<SubscriptionInfo> {
    const res = await this.request<{ subscription: SubscriptionInfo }>(
      '/billing/subscription',
      { method: 'GET' },
      options,
    );
    return res.subscription;
  }

  // =========================================================================
  // Destinations / Integrations
  // =========================================================================

  /** List workspace storage integrations. */
  async listIntegrations(options?: RequestOptions): Promise<Integration[]> {
    const res = await this.request<IntegrationListResponse>(
      '/v1/integrations',
      { method: 'GET' },
      options,
    );
    return res.integrations;
  }

  /** Create a workspace storage integration. */
  async createIntegration(
    request: CreateIntegrationRequest,
    options?: RequestOptions,
  ): Promise<Integration> {
    const res = await this.request<IntegrationResponse>(
      '/v1/integrations',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
    return res.integration;
  }

  /** Update a workspace storage integration. */
  async updateIntegration(
    id: string,
    request: UpdateIntegrationRequest,
    options?: RequestOptions,
  ): Promise<Integration> {
    const res = await this.request<IntegrationResponse>(
      `/v1/integrations/${encodePath(id)}`,
      { method: 'PUT', body: JSON.stringify(request) },
      options,
    );
    return res.integration;
  }

  /** Delete a workspace storage integration. */
  async deleteIntegration(
    id: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/integrations/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }

  /** Test a workspace storage integration. */
  async testIntegration(
    id: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/integrations/${encodePath(id)}/test`,
      { method: 'POST' },
      options,
    );
  }

  /** Get the legacy default destination for the workspace. */
  async getDestination(options?: RequestOptions): Promise<Destination> {
    const res = await this.request<{ destination: Destination }>(
      '/v1/destination',
      { method: 'GET' },
      options,
    );
    return res.destination;
  }

  /** Set the legacy default destination for the workspace. */
  async setDestination(
    request: SetDestinationRequest,
    options?: RequestOptions,
  ): Promise<Destination> {
    const res = await this.request<{ destination: Destination }>(
      '/v1/destination',
      { method: 'PUT', body: JSON.stringify(request) },
      options,
    );
    return res.destination;
  }

  /** Test the legacy default destination configuration. */
  async testDestination(
    request: SetDestinationRequest,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      '/v1/destination/test',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
  }

  /** Delete the legacy default destination. */
  async deleteDestination(
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      '/v1/destination',
      { method: 'DELETE' },
      options,
    );
  }

  // =========================================================================
  // API Keys
  // =========================================================================

  /** List API keys for the authenticated user. */
  async listApiKeys(options?: RequestOptions): Promise<ApiKey[]> {
    const res = await this.request<ApiKeyListResponse>(
      '/v1/api-keys',
      { method: 'GET' },
      options,
    );
    return res.keys;
  }

  /** Create a new API key. The secret key is returned only once. */
  async createApiKey(
    request: CreateApiKeyRequest,
    options?: RequestOptions,
  ): Promise<ApiKeyWithSecret> {
    return this.request<ApiKeyWithSecret>(
      '/v1/api-keys',
      { method: 'POST', body: JSON.stringify(request) },
      options,
    );
  }

  /** Delete an API key. */
  async deleteApiKey(
    id: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/v1/api-keys/${encodePath(id)}`,
      { method: 'DELETE' },
      options,
    );
  }
}

export type {
  RenderOutput,
  WebhookEvent,
  Workflow,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowStepType,
};
