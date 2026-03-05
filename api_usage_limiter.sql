-- ==========================================
-- API Usage Limiter - Migration
-- ==========================================

-- Table: Configurable limits per API endpoint
CREATE TABLE IF NOT EXISTS api_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    monthly_limit INTEGER NOT NULL DEFAULT 50,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Usage log per user per endpoint
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_user_endpoint_date
ON api_usage (user_id, endpoint, used_at);

-- RLS Policies
ALTER TABLE api_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- api_limits: Anyone can read, only service role can write
CREATE POLICY "Anyone can read api_limits" ON api_limits FOR SELECT USING (true);

-- api_usage: Users can read their own, service role inserts
CREATE POLICY "Users can read own api_usage" ON api_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert api_usage" ON api_usage FOR INSERT WITH CHECK (true);

-- Insert default limits for all cost-generating endpoints
INSERT INTO api_limits (endpoint, monthly_limit, enabled, description) VALUES
    ('parse-bank-statement', 30, true, 'Importar extractos bancarios (Gemini AI)'),
    ('zai-ocr', 50, true, 'OCR de imágenes (Z.ai)'),
    ('identify-product', 30, true, 'Identificar productos (IA)'),
    ('identify-medicine', 30, true, 'Identificar medicamentos (IA)'),
    ('generate-recipe', 30, true, 'Generar recetas (IA)'),
    ('ocr-space', 50, true, 'OCR Space'),
    ('whisperer', 20, true, 'Transcripción de audio (Whisper)')
ON CONFLICT (endpoint) DO NOTHING;
