-- database/init.sql

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(255),
    webhook_secret VARCHAR(64), -- Added for Deliverable 2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Test Merchant (Required by instructions)
INSERT INTO merchants (email, password_hash, webhook_secret)
VALUES ('test@example.com', 'hashed_secret_password', 'whsec_test_abc123')
ON CONFLICT (email) DO NOTHING;

-- 2. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY, -- "pay_" + random chars
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    order_id VARCHAR(64) NOT NULL,
    amount INTEGER NOT NULL, -- in smallest currency unit (e.g., paise)
    currency VARCHAR(3) DEFAULT 'INR',
    method VARCHAR(20) NOT NULL, -- 'upi', 'card'
    vpa VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- Changed default to 'pending' for async flow
    captured BOOLEAN DEFAULT FALSE,       -- Added for Deliverable 2
    error_code VARCHAR(50),
    error_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Refunds Table (New for Deliverable 2)
CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(64) PRIMARY KEY, -- "rfnd_" + 16 chars
    payment_id VARCHAR(64) NOT NULL REFERENCES payments(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);

-- 4. Webhook Logs Table (New for Deliverable 2)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    event VARCHAR(50) NOT NULL, -- e.g., "payment.success"
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed'
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    response_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_webhook_logs_merchant_id ON webhook_logs(merchant_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_retry ON webhook_logs(next_retry_at) WHERE status = 'pending';

-- 5. Idempotency Keys Table (New for Deliverable 2)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    response JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (key, merchant_id)
);