-- Supabase PostgreSQL Schema for BRIDGE Delivery Engine

-- 1. Shipments Table (Pre-dispatch queue)
CREATE TABLE IF NOT EXISTS shipments (
    package_id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64),
    station_code VARCHAR(16),
    departure_hour INT,
    customer_availability_rate NUMERIC(5,4),
    customer_delivery_preference VARCHAR(32),
    location_type VARCHAR(32) DEFAULT 'Residential',
    signature_required SMALLINT DEFAULT 0,
    address_access_difficulty INT,
    customer_previous_delivery_attempts INT DEFAULT 0,
    customer_previous_failed_attempts INT DEFAULT 0,
    customer_previous_success_rate NUMERIC(5,4) DEFAULT 1.0,
    zone_id VARCHAR(32),
    failure_probability NUMERIC(5,4) NOT NULL,
    risk_tier VARCHAR(16) NOT NULL,
    applied_intervention VARCHAR(64),
    final_failure_probability NUMERIC(5,4),
    final_risk_tier VARCHAR(16),
    status VARCHAR(64) DEFAULT 'QUEUED_FOR_DISPATCH',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customer Interventions Table (Audit log of preferences selected by customers)
CREATE TABLE IF NOT EXISTS customer_interventions (
    id BIGSERIAL PRIMARY KEY,
    package_id VARCHAR(64) REFERENCES shipments(package_id) ON DELETE CASCADE,
    intervention_id VARCHAR(64) NOT NULL,
    intervention_title VARCHAR(128) NOT NULL,
    original_failure_prob NUMERIC(5,4) NOT NULL,
    new_failure_prob NUMERIC(5,4) NOT NULL,
    risk_reduction_pct NUMERIC(5,2) NOT NULL,
    customer_response_channel VARCHAR(32) DEFAULT 'MOBILE_PORTAL',
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Live Delivery Feedback Loop Table (Outcomes reported after delivery attempts)
CREATE TABLE IF NOT EXISTS delivery_outcomes (
    id BIGSERIAL PRIMARY KEY,
    package_id VARCHAR(64) REFERENCES shipments(package_id) ON DELETE CASCADE,
    outcome VARCHAR(32) NOT NULL, -- DELIVERED, FAILED
    failure_reason VARCHAR(64) DEFAULT 'NONE',
    delivery_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Geographic Zone Priors Table (Dynamic Bayesian prior smoothing by zone)
CREATE TABLE IF NOT EXISTS zone_priors (
    zone_id VARCHAR(32) PRIMARY KEY,
    prior_failure_rate NUMERIC(5,4) DEFAULT 0.09,
    total_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. System Metrics Snapshot Table (For Executive Logistics Dashboards)
CREATE TABLE IF NOT EXISTS dispatch_metrics_history (
    id BIGSERIAL PRIMARY KEY,
    total_evaluated INT NOT NULL,
    high_risk_flagged INT NOT NULL,
    interventions_confirmed INT NOT NULL,
    first_attempt_success_rate NUMERIC(5,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_priors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_metrics_history ENABLE ROW LEVEL SECURITY;

-- Allow public read and insert for hackathon demo
CREATE POLICY "Allow public read shipments" ON shipments FOR SELECT USING (true);
CREATE POLICY "Allow public insert shipments" ON shipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update shipments" ON shipments FOR UPDATE USING (true);

CREATE POLICY "Allow public read interventions" ON customer_interventions FOR SELECT USING (true);
CREATE POLICY "Allow public insert interventions" ON customer_interventions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read delivery_outcomes" ON delivery_outcomes FOR SELECT USING (true);
CREATE POLICY "Allow public insert delivery_outcomes" ON delivery_outcomes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read zone_priors" ON zone_priors FOR SELECT USING (true);
CREATE POLICY "Allow public update zone_priors" ON zone_priors FOR ALL USING (true);
