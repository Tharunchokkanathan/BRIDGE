import { z } from 'zod';

// ============================================================================
// 1. Health & Infrastructure
// ============================================================================

export const DatabaseStatusSchema = z.object({
  is_supabase_connected: z.boolean().optional(),
  backend: z.string().optional(),
  shipments_stored: z.number().optional(),
  interventions_logged: z.number().optional(),
  completed_deliveries: z.number().optional(),
  delivery_outcomes_recorded: z.number().optional(),
  dynamic_zone_priors_active: z.number().optional(),
  status: z.string().optional(),
}).passthrough();

export const OperationalThresholdsSchema = z.object({
  tau_low: z.number().optional(),
  tau_med: z.number().optional(),
  max_fleet_capacity: z.number().optional(),
}).passthrough();

export const HealthResponseSchema = z.object({
  status: z.string(),
  active_model: z.string(),
  champion_model: z.string(),
  is_champion_active: z.boolean(),
  sample_count: z.number().optional(),
  manifest_id: z.string().optional(),
  database: DatabaseStatusSchema.optional(),
  available_models: z.array(z.string()).optional(),
  calibrated: z.boolean().optional(),
  explainer_type: z.string().optional(),
  operational_thresholds: OperationalThresholdsSchema.optional(),
}).passthrough();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;
export type OperationalThresholds = z.infer<typeof OperationalThresholdsSchema>;

// ============================================================================
// 2. Dashboard Stats Telemetry
// ============================================================================

export const DashboardStatsSchema = z.object({
  total_packages_evaluated: z.number().optional(),
  high_risk_count: z.number().optional(),
  medium_risk_count: z.number().optional(),
  low_risk_count: z.number().optional(),
  fleet_capacity_limit: z.number().optional(),
  capacity_approved_count: z.number().optional(),
  capacity_exhausted: z.boolean().optional(),
  capacity_utilization_rate: z.number().optional(),
  expected_first_attempt_failures: z.number().optional(),
  projected_failures_prevented: z.number().optional(),
  route_distance_km: z.number().optional(),
  potential_distance_savings_km: z.number().optional(),
  potential_savings_pct: z.number().optional(),
  active_manifest_id: z.string().optional(),
  routes_detected: z.array(z.string()).optional(),
  active_model: z.string().optional(),
  champion_model: z.string().optional(),
  is_champion_active: z.boolean().optional(),
}).passthrough();

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ============================================================================
// 3. Model Metadata & Switch
// ============================================================================

export const ModelMetricsSchema = z.object({
  pr_auc: z.number(),
  roc_auc: z.number(),
  brier_score: z.number(),
  ks_statistic: z.number(),
});

export const ModelSwitchResponseSchema = z.object({
  message: z.string(),
  active_model: z.string(),
  champion_model: z.string(),
  is_champion_active: z.boolean(),
  calibrated: z.boolean().optional(),
  explainer_type: z.string().optional(),
});

export type ModelSwitchResponse = z.infer<typeof ModelSwitchResponseSchema>;

// ============================================================================
// 4. Shipments & Risk Queue
// ============================================================================

export const RiskFactorSchema = z.object({
  factor: z.string(),
  detail: z.string(),
  severity: z.string(),
  feature_name: z.string().optional(),
  attribution_score: z.number().optional(),
  shap_logit: z.number().optional(),
});

export const PredictionSchema = z.object({
  failure_probability: z.number(),
  raw_probability: z.number().optional(),
  failure_percentage: z.number().optional(),
  risk_tier: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  badge_color: z.string().optional(),
  recommended_action: z.string().optional(),
  capacity_rank: z.number().optional(),
  capacity_approved: z.boolean().optional(),
  capacity_status: z.string().optional(),
  fleet_allocation_rate: z.number().optional(),
  risk_factors: z.array(RiskFactorSchema).optional(),
});

export const ShipmentRecordSchema = z.object({
  package_id: z.string(),
  route_id: z.string().optional(),
  stop_id: z.string().optional(),
  station_code: z.string().optional(),
  preferred_delivery_method: z.string().optional(),
  customer_delivery_preference: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  planned_service_time_seconds: z.number().optional(),
  departure_hour: z.number().optional(),
  customer_availability_rate: z.number().optional(),
  address_access_difficulty: z.number().optional(),
  signature_required: z.number().optional(),
  delivery_window_start: z.string().optional(),
  delivery_window_end: z.string().optional(),
  applied_intervention: z.string().optional(),
  prediction: PredictionSchema.optional(),
});

export const ShipmentListResponseSchema = z.object({
  count: z.number(),
  shipments: z.array(ShipmentRecordSchema),
});

export type ShipmentRecord = z.infer<typeof ShipmentRecordSchema>;
export type ShipmentListResponse = z.infer<typeof ShipmentListResponseSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type RiskFactor = z.infer<typeof RiskFactorSchema>;

// ============================================================================
// 5. Route Optimization
// ============================================================================

export const RouteOptimizeRequestSchema = z.object({
  route_id: z.string().optional(),
  apply_interventions: z.boolean().optional(),
  return_to_depot: z.boolean().optional(),
});

export const RouteStopSchema = z.object({
  sequence: z.number(),
  package_id: z.string(),
  stop_id: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  is_locker_stop: z.boolean().optional(),
  failure_probability: z.number().optional(),
  risk_tier: z.string().optional(),
});

export const RouteOptimizeResponseSchema = z.object({
  route_id: z.string(),
  original_distance_km: z.number(),
  optimized_distance_km: z.number(),
  distance_saved_km: z.number(),
  reduction_pct: z.number(),
  original_stops_count: z.number(),
  optimized_stops_count: z.number(),
  stops_consolidated: z.number(),
  circuity_factor: z.number().optional(),
  optimization_latency_ms: z.number().optional(),
  stops_sequence: z.array(RouteStopSchema).optional(),
});

export type RouteOptimizeResponse = z.infer<typeof RouteOptimizeResponseSchema>;
