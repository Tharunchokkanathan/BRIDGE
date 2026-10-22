import {
  HealthResponse,
  HealthResponseSchema,
  DashboardStats,
  DashboardStatsSchema,
  ShipmentListResponse,
  ShipmentListResponseSchema,
  ModelSwitchResponse,
  ModelSwitchResponseSchema,
  RouteOptimizeResponse,
  RouteOptimizeResponseSchema,
  InterventionSimulateResponse,
  InterventionSimulateResponseSchema,
  MessagePreviewResponse,
  MessagePreviewResponseSchema,
  DeliveryCompleteResponse,
  DeliveryCompleteResponseSchema,
  ManifestUploadResponse,
  ManifestUploadResponseSchema,
  DatabaseStatus,
  DatabaseStatusSchema,
} from './types';

export class ApiError extends Error {
  public status: number;
  public detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const API_BASE = '/api';

async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const apiKey = localStorage.getItem('bridge_api_key');
  if (apiKey) {
    (headers as Record<string, string>)['X-API-Key'] = apiKey;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorJson.message || response.statusText;
      } catch {
        errorDetail = response.statusText;
      }
      throw new ApiError(response.status, `HTTP ${response.status}: ${errorDetail}`, errorDetail);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown network failure';
    throw new ApiError(0, `Network Connection Failed: ${message}`);
  }
}

export const api = {
  /**
   * Health check and engine telemetry
   */
  async getHealth(): Promise<HealthResponse> {
    const data = await fetchJson<unknown>('/health');
    return HealthResponseSchema.parse(data);
  },

  /**
   * Dashboard statistics and capacity limits
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const data = await fetchJson<unknown>('/dashboard/stats');
    return DashboardStatsSchema.parse(data);
  },

  /**
   * Active manifest shipments
   */
  async getShipments(limit?: number): Promise<ShipmentListResponse> {
    const query = limit ? `?limit=${limit}` : '';
    const data = await fetchJson<unknown>(`/shipments/sample${query}`);
    return ShipmentListResponseSchema.parse(data);
  },

  /**
   * Switch active model between Champion and Candidate
   */
  async switchModel(modelName: string): Promise<ModelSwitchResponse> {
    const data = await fetchJson<unknown>('/model/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: modelName }),
    });
    return ModelSwitchResponseSchema.parse(data);
  },

  /**
   * Reset manifest back to canonical 30-stop benchmark
   */
  async resetManifest(): Promise<{ status: string; message: string }> {
    return await fetchJson<{ status: string; message: string }>('/manifest/reset', {
      method: 'POST',
    });
  },

  /**
   * Run 2-Opt route optimization
   */
  async optimizeRoute(options: {
    route_id?: string;
    apply_interventions?: boolean;
    return_to_depot?: boolean;
  } = {}): Promise<RouteOptimizeResponse> {
    const data = await fetchJson<unknown>('/route/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return RouteOptimizeResponseSchema.parse(data);
  },

  /**
   * Simulate counterfactual customer interventions
   */
  async simulateInterventions(shipment: Record<string, any>): Promise<InterventionSimulateResponse> {
    const data = await fetchJson<unknown>('/intervene/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment }),
    });
    return InterventionSimulateResponseSchema.parse(data);
  },

  /**
   * Apply customer intervention and update delivery plan
   */
  async applyIntervention(packageId: string, interventionId: string): Promise<{
    status: string;
    message: string;
    persisted_to_db: boolean;
    updated_shipment?: Record<string, any>;
  }> {
    return await fetchJson<{
      status: string;
      message: string;
      persisted_to_db: boolean;
      updated_shipment?: Record<string, any>;
    }>('/intervene/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, intervention_id: interventionId }),
    });
  },

  /**
   * Preview multi-channel messaging template
   */
  async previewMessaging(params: {
    package_id: string;
    intervention_id: string;
    channel: string;
    recipient_name?: string;
    eta_window?: string;
  }): Promise<MessagePreviewResponse> {
    const data = await fetchJson<unknown>('/messaging/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return MessagePreviewResponseSchema.parse(data);
  },

  /**
   * Complete delivery attempt (Live Feedback Loop)
   */
  async completeDelivery(params: {
    package_id: string;
    outcome: 'DELIVERED' | 'FAILED';
    failure_reason?: string;
    delivery_notes?: string;
  }): Promise<DeliveryCompleteResponse> {
    const data = await fetchJson<unknown>('/delivery/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return DeliveryCompleteResponseSchema.parse(data);
  },

  /**
   * Upload dynamic CSV or JSON manifest
   */
  async uploadManifest(formData: FormData, dryRun: boolean = false): Promise<ManifestUploadResponse> {
    const query = dryRun ? '?dry_run=true' : '?dry_run=false';
    const apiKey = localStorage.getItem('bridge_api_key');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const res = await fetch(`${API_BASE}/manifest/upload${query}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      let errText = 'Upload failed';
      try {
        const j = await res.json();
        errText = j.detail || j.message || errText;
      } catch {
        errText = res.statusText;
      }
      throw new ApiError(res.status, errText);
    }
    const data = await res.json();
    return ManifestUploadResponseSchema.parse(data);
  },

  /**
   * Database backend status
   */
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const data = await fetchJson<unknown>('/database/status');
    return DatabaseStatusSchema.parse(data);
  },

  /**
   * Model governance metadata
   */
  async getModelMetadata(): Promise<Record<string, any>> {
    return await fetchJson<Record<string, any>>('/model/metadata');
  },
};
