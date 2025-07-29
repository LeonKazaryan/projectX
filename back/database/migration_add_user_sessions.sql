-- Migration: Add user_sessions table for storing Telegram and WhatsApp sessions
-- Date: 2024-01-XX

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('telegram', 'whatsapp')),
    session_string TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_platform ON user_sessions(user_id, platform);

-- Add comment
COMMENT ON TABLE user_sessions IS 'Stores Telegram and WhatsApp session strings for authenticated users';
COMMENT ON COLUMN user_sessions.platform IS 'Platform type: telegram or whatsapp';
COMMENT ON COLUMN user_sessions.session_string IS 'Encrypted session string for the platform'; 