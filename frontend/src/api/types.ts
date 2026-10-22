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
  capacity_deferred_count: z.number().optional(),
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
  operational_thresholds: OperationalThresholdsSchema.optional(),
  database_status: DatabaseStatusSchema.optional(),
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
}).passthrough();

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
  zone_id: z.string().optional(),
  location_type: z.string().optional(),
  signature_required: z.number().optional(),
  delivery_window_start: z.string().optional(),
  delivery_window_end: z.string().optional(),
  applied_intervention: z.union([z.string(), z.record(z.any()), z.null()]).optional(),
  prediction: PredictionSchema.optional(),
}).passthrough();

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
  sequence_order: z.number().optional(),
  sequence: z.number().optional(),
  package_id: z.string().optional(),
  package_ids: z.array(z.string()).optional(),
  package_count: z.number().optional(),
  stop_id: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  is_locker_stop: z.boolean().optional(),
  failure_probability: z.number().optional(),
  risk_tier: z.string().optional(),
}).passthrough();

export const RouteOptimizeResponseSchema = z.object({
  route_id: z.string().optional(),
  original_distance_km: z.number(),
  optimized_distance_km: z.number(),
  distance_savings_km: z.number().optional(),
  distance_saved_km: z.number().optional(),
  distance_savings_pct: z.number().optional(),
  reduction_pct: z.number().optional(),
  original_stops_count: z.number().optional(),
  optimized_stops_count: z.number().optional(),
  stops_count: z.number().optional(),
  stops_consolidated: z.number().optional(),
  estimated_duration_minutes: z.number().optional(),
  savings_target_met: z.boolean().optional(),
  circuity_factor: z.number().optional(),
  optimization_latency_ms: z.number().optional(),
  stops: z.array(RouteStopSchema).optional(),
  stops_sequence: z.array(RouteStopSchema).optional(),
}).passthrough();

export type RouteOptimizeResponse = z.infer<typeof RouteOptimizeResponseSchema>;
export type RouteStop = z.infer<typeof RouteStopSchema>;

// ============================================================================
// 6. Interventions & Messaging
// ============================================================================

export const InterventionOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  cost_tier: z.string().optional(),
  effort_level: z.string().optional(),
  new_prob: z.number().optional(),
  new_risk_tier: z.string().optional(),
  risk_reduction_points: z.number().optional(),
  utility_score: z.number().optional(),
  is_rule_based_heuristic: z.boolean().optional(),
  recommended: z.boolean().optional(),
  simulation_disclaimer: z.string().optional(),
}).passthrough();

export const InterventionSimulateResponseSchema = z.object({
  original_failure_prob: z.number(),
  original_risk_tier: z.string(),
  intervention_options: z.array(InterventionOptionSchema),
}).passthrough();

export const MessagePreviewResponseSchema = z.object({
  package_id: z.string(),
  channel: z.string(),
  recipient_name: z.string().optional(),
  headline: z.string().optional(),
  subject: z.string().optional(),
  body: z.string(),
  cta_text: z.string().optional(),
  cta_url: z.string().optional(),
  preview_disclaimer: z.string().optional(),
}).passthrough();

export type InterventionOption = z.infer<typeof InterventionOptionSchema>;
export type InterventionSimulateResponse = z.infer<typeof InterventionSimulateResponseSchema>;
export type MessagePreviewResponse = z.infer<typeof MessagePreviewResponseSchema>;

// ============================================================================
// 7. Zone Priors & Delivery Outcomes
// ============================================================================

export const ZonePriorRecordSchema = z.object({
  zone_id: z.string(),
  description: z.string().optional(),
  alpha: z.number(),
  beta: z.number(),
  sample_count: z.number().optional(),
  mean_failure_rate: z.number().optional(),
  variance: z.number().optional(),
  trend: z.string().optional(),
});

export const DeliveryCompleteResponseSchema = z.object({
  status: z.string(),
  outcome_recorded: z.string().optional(),
  updated_customer_history: z.object({
    previous_attempts: z.number(),
    previous_fails: z.number(),
    new_success_rate: z.number(),
  }).optional(),
  zone_prior_update: z.object({
    zone_id: z.string().optional(),
    alpha: z.number().optional(),
    beta: z.number().optional(),
    updated_prior_rate: z.number().optional(),
  }).optional(),
}).passthrough();

export type ZonePriorRecord = z.infer<typeof ZonePriorRecordSchema>;
export type DeliveryCompleteResponse = z.infer<typeof DeliveryCompleteResponseSchema>;

// ============================================================================
// 8. Dynamic Manifest & Data Quality
// ============================================================================

export const DataQualitySummarySchema = z.object({
  total_rows_received: z.number(),
  valid_rows: z.number(),
  quarantined_leakage_columns: z.array(z.string()).optional(),
  missing_crm_columns_imputed: z.array(z.string()).optional(),
  fleet_capacity_approved_count: z.number().optional(),
  routes_detected: z.array(z.string()).optional(),
}).passthrough();

export const ManifestUploadResponseSchema = z.object({
  status: z.string(),
  manifest_id: z.string().optional(),
  filename: z.string().optional(),
  total_packages: z.number().optional(),
  routes_detected: z.array(z.string()).optional(),
  data_quality_summary: DataQualitySummarySchema.optional(),
  shipments: z.array(ShipmentRecordSchema).optional(),
  dry_run: z.boolean().optional(),
}).passthrough();

export type DataQualitySummary = z.infer<typeof DataQualitySummarySchema>;
export type ManifestUploadResponse = z.infer<typeof ManifestUploadResponseSchema>;
