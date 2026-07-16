/**
 * Shared request options available on every SDK method.
 */
export interface RequestOptions {
  /** AbortSignal that can cancel the underlying request. */
  signal?: AbortSignal;
  /** Override the default request timeout for this call. */
  requestTimeoutMs?: number;
}

/**
 * Options for methods that poll until a job reaches a terminal state.
 */
export interface PollOptions extends RequestOptions {
  /**
   * How often to poll for status updates, in milliseconds.
   * @default 2000
   */
  pollIntervalMs?: number;
  /**
   * Maximum total time to wait for the job, in milliseconds.
   * @default 300_000 (5 minutes)
   */
  maxPollTimeMs?: number;
}

export interface ProgressInfo {
  jobId: string;
  status: string;
  progress: number;
}

export interface ClientOptions {
  /** API key from your iLoveVideoEditor dashboard. Required for API-key auth. */
  apiKey?: string;
  /** JWT access token. Required for user-scoped endpoints that do not accept API keys. */
  bearerToken?: string;
  /**
   * Base URL of the iLoveVideoEditor API.
   * @default 'https://api.ilovevideoeditor.com'
   */
  baseUrl?: string;
  /**
   * Default timeout for individual requests, in milliseconds.
   * @default 30000
   */
  requestTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: string;
}

export interface ServiceHealth {
  status: 'ok' | 'error' | 'not_configured' | 'unknown';
  latencyMs?: number | null;
  error?: string | null;
}

export interface DetailedHealthStatus {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: Record<string, ServiceHealth>;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export interface VideoJSON {
  [key: string]: unknown;
}

export interface QueueRenderRequest {
  videoJSON: VideoJSON;
  webhookUrl?: string;
  projectId?: string;
}

export interface QueuedRender {
  jobId: string;
  status: string;
  stage?: string;
}

export interface SegmentProgress {
  done: number;
  total: number;
  percent: number;
}

export interface RenderOutput {
  provider: string;
  integrationId?: string;
  outputKey?: string;
  outputUrl?: string;
  outputSizeBytes?: number;
  status?: string;
  error?: string;
}

export interface RenderResult {
  jobId: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  stage?: string;
  progress?: SegmentProgress;
  url?: string;
  downloadUrl?: string;
  outputKey?: string;
  error?: string | null;
  outputs?: RenderOutput[];
  createdAt?: string;
  completedAt?: string | null;
}

export interface RenderListItem {
  id: string;
  status: string;
  stage?: string;
  progress: number;
  url?: string | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  spriteUrl?: string | null;
  cost?: number | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface RenderCostEstimate {
  cost: number;
  estimatedDuration: number;
  resolution: {
    width: number;
    height: number;
    label: string;
  };
  fps: number;
  tier?: {
    tier: string;
    credits_balance?: number;
    monthly_credits?: number;
  } | null;
}

export interface RenderDownloadUrl {
  downloadUrl: string;
  filename: string;
}

export interface RefreshUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface CancelRenderResponse {
  success: boolean;
  jobId?: string;
  status?: string;
  previousStatus?: string;
}

export interface TrackBandwidthResponse {
  tracked: boolean;
}

export interface TierInfo {
  tier: string;
  credits: {
    balance: number;
    monthly: number;
    max?: number;
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  accentColor?: string;
  icon?: string;
  toolId?: string | null;
}

export interface TemplateVariableSchema {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  [key: string]: unknown;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  accentColor?: string;
  icon?: string;
  toolId?: string | null;
  defaultConfig?: Record<string, unknown> | null;
  variablesSchema?: TemplateVariableSchema[] | null;
}

export interface RenderTemplateRequest {
  variables?: Record<string, unknown>;
  webhookUrl?: string;
  projectId?: string;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export interface ToolJobDimensions {
  width: number;
  height: number;
}

export interface CreateToolJobRequest {
  inputUrl: string;
  config: Record<string, unknown>;
  webhookUrl?: string;
  duration?: number;
  dimensions?: ToolJobDimensions;
}

export interface QueuedToolJob {
  jobId: string;
  status: string;
  stage: string;
  mode?: 'native' | 'render';
}

export interface ToolJobResult {
  jobId: string;
  status: string;
  stage: string;
  mode?: 'native' | 'render';
  outputKey?: string;
  url?: string;
  error?: string;
  progress?: SegmentProgress;
  outputs?: RenderOutput[];
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  video_json?: VideoJSON | null;
  thumbnail_url?: string | null;
  sprite_url?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  status?: string | null;
  render_job_id?: string | null;
  output_url?: string | null;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  last_opened_at?: string | null;
}

export interface LastRendition {
  id?: string;
  job_id?: string | null;
  status?: string;
  stage?: string;
  cost?: number | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  output_url?: string | null;
  output_size_bytes?: number | null;
  error?: string | null;
  progress_percent?: number | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface ProjectWithRendition {
  project: Project;
  lastRendition?: LastRendition | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  video_json?: VideoJSON;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  video_json?: VideoJSON;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface PatchProjectRequest {
  name?: string;
  description?: string | null;
  video_json?: VideoJSON | null;
  thumbnail_url?: string | null;
  thumbnail_base64?: string;
  sprite_url?: string | null;
  sprite_base64?: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  status?: string | null;
  render_job_id?: string | null;
  output_url?: string | null;
  processed_at?: string | null;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectStatsResponse {
  total: number;
}

export interface DuplicateProjectResponse {
  project: Project;
}

export interface BatchDeleteResponse {
  id?: string;
  deleted: true;
}

export interface BatchDeleteManyResponse {
  deleted: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export type AssetType = 'image' | 'video' | 'audio' | 'font';

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface Asset {
  id: string;
  workspace_id: string;
  name: string;
  type: AssetType;
  content_type?: string;
  size_bytes?: number | null;
  storage_key: string;
  asset_url?: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  metadata?: AssetMetadata | null;
  created_by?: string;
  created_at?: string;
}

export interface AssetUploadUrlRequest {
  filename: string;
  contentType: string;
}

export interface AssetUploadUrlResponse {
  uploadUrl: string;
  assetUrl: string;
  path: string;
  assetId: string;
  type: AssetType;
}

export interface RegisterAssetRequest {
  id: string;
  name: string;
  type: AssetType;
  contentType: string;
  size?: number;
  storage_key: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetSignedUrlResponse {
  signedUrl: string;
}

export interface UploadAssetOptions extends RequestOptions {
  filename: string;
  contentType: string;
  type: AssetType;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Renditions
// ---------------------------------------------------------------------------

export interface Rendition {
  id: string;
  job_id: string | null;
  project_id?: string | null;
  status: string;
  stage?: string;
  cost?: number | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  output_url?: string | null;
  output_size_bytes?: number | null;
  error?: string | null;
  progress_percent?: number | null;
  created_at?: string;
  completed_at?: string | null;
  sprite_url?: string | null;
  video_json?: VideoJSON | null;
  outputs?: RenderOutput[];
  projects?: {
    id?: string;
    name?: string;
    thumbnail_url?: string | null;
  } | null;
}

export interface RenditionListResponse {
  renditions: Rendition[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RenditionStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
  rendering: number;
}

export interface CancelRenditionResponse {
  id: string;
  jobId?: string | null;
  status: string;
  refunded: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type WebhookEvent = 'render.completed' | 'render.failed';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: string;
}

export interface WebhookSubscriptionCreate {
  url: string;
  events?: WebhookEvent[];
}

export interface WebhookSubscriptionListResponse {
  subscriptions: WebhookSubscription[];
}

export interface RenderWebhookPayload {
  event: WebhookEvent;
  id: string;
  status: 'completed' | 'failed';
  stage?: string;
  progress?: number;
  url?: string | null;
  outputs?: Array<Record<string, unknown>>;
  duration?: number;
  width?: number;
  height?: number;
  templateId?: string;
  cost?: number;
  error?: string | null;
  createdAt?: string;
  completedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export type WorkflowStepType =
  | 'upload_asset'
  | 'crawl_url'
  | 'discover_variables'
  | 'render_template'
  | 'render_videojson'
  | 'apply_tool'
  | 'review'
  | 'send_to_destination';

export interface WorkflowVariableDefinition {
  type: 'string' | 'number' | 'boolean' | 'asset_url' | 'url' | 'text';
  label: string;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
}

export interface WorkflowStep {
  type: WorkflowStepType;
  name?: string;
  maxRetries?: number;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  version: 1;
  variables: Record<string, WorkflowVariableDefinition>;
  steps: WorkflowStep[];
}

export interface Workflow {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  definition: WorkflowDefinition;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workspaceId: string;
  triggeredBy: string;
  trigger?: string;
  status: string;
  variables?: Record<string, unknown>;
  estimatedCost?: number | null;
  totalCost?: number | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunStep {
  id: string;
  workflowRunId: string;
  stepIndex: number;
  stepType: WorkflowStepType;
  name?: string | null;
  config?: Record<string, unknown>;
  status: string;
  inputUrl?: string | null;
  outputUrl?: string | null;
  outputKey?: string | null;
  renditionId?: string | null;
  error?: string | null;
  responseStatus?: number | null;
  metadata?: Record<string, unknown> | null;
  retryCount: number;
  maxRetries: number;
  logs?: Record<string, unknown> | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  isActive?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string | null;
  definition?: WorkflowDefinition;
  isActive?: boolean;
}

export interface RunWorkflowRequest {
  variables?: Record<string, unknown>;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowDetailResponse {
  workflow: Workflow;
  recentRuns: WorkflowRun[];
}

export interface WorkflowRunListResponse {
  runs: WorkflowRun[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowRunDetailResponse {
  run: WorkflowRun;
  steps: WorkflowRunStep[];
}

export interface ReviewWorkflowStepRequest {
  action: 'approve' | 'reject';
  /** Variable edits applied on approve (limited to the step's editable keys). */
  variables?: Record<string, unknown>;
}

export interface StepTypeInfo {
  type: WorkflowStepType;
  label?: string;
  description?: string;
}

export interface StepTypesResponse {
  stepTypes: StepTypeInfo[];
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export interface BillingPrices {
  tiers: {
    starter: string | null;
    pro: string | null;
    business: string | null;
  };
  credits: {
    '800': string | null;
    '1500': string | null;
    '8000': string | null;
  };
}

export interface SubscriptionInfo {
  status: string;
  currentPeriodEnd: string | null;
  creditsBalance: number;
  creditsTotal: number;
  tier: string;
}

export interface CheckoutSessionRequest {
  productId?: string;
  tierId?: string;
  mode?: 'subscription' | 'payment';
  credits?: number;
}

export interface CheckoutSessionResponse {
  url: string | null;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  subscription: SubscriptionInfo;
}

export interface CreditLog {
  id: string;
  action: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  job_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UsageSummary {
  purchased: number;
  consumed: number;
  refunded: number;
  consumed30Days: number;
}

export interface UsageQuota {
  usedBytes: number;
  freeBytes: number;
  chargeBlockBytes: number;
  overBytes: number;
  creditsCharged: number;
}

export interface BandwidthUsage extends UsageQuota {
  resetAt: string;
}

export interface CreditsResponse {
  balance: number;
  total: number;
  summary: UsageSummary;
  usage: {
    storage: UsageQuota;
    bandwidth: BandwidthUsage;
  };
  logs: CreditLog[];
}

export interface UsageLog {
  id: string;
  type: string;
  bytes?: number | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface UsageResponse {
  usage: UsageLog[];
}

// ---------------------------------------------------------------------------
// Destinations / Integrations
// ---------------------------------------------------------------------------

export type StorageProvider =
  | 's3'
  | 'r2'
  | 'b2'
  | 'wasabi'
  | 'gcs'
  | 'azure'
  | 'drive';

export interface Integration {
  id: string;
  workspaceId: string;
  provider: StorageProvider;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationRequest {
  provider: StorageProvider;
  name: string;
  isActive?: boolean;
  isDefault?: boolean;
  config: Record<string, unknown>;
}

export interface UpdateIntegrationRequest {
  provider?: StorageProvider;
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  config?: Record<string, unknown>;
}

export interface IntegrationListResponse {
  integrations: Integration[];
}

export interface IntegrationResponse {
  integration: Integration;
}

export interface Destination {
  id: string;
  provider: StorageProvider;
  endpoint?: string | null;
  region?: string | null;
  bucket?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  publicUrl?: string | null;
  pathPrefix?: string | null;
  driveAccessToken?: string | null;
  driveRefreshToken?: string | null;
  driveFolderId?: string | null;
  driveExpiresAt?: string | null;
}

export interface SetDestinationRequest {
  provider: 's3' | 'r2' | 'b2' | 'wasabi';
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
  pathPrefix?: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  name: string;
  prefix?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
}

export interface ApiKeyWithSecret extends ApiKey {
  apiKey: string;
}

export interface ApiKeyListResponse {
  keys: ApiKey[];
}

export interface CreateApiKeyRequest {
  name: string;
}

// ---------------------------------------------------------------------------
// Pagination / listing helpers
// ---------------------------------------------------------------------------

export interface PaginationOptions extends RequestOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeOptions {
  from?: string;
  to?: string;
}
