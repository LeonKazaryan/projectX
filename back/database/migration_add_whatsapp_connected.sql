-- Migration: Add is_whatsapp_connected column to users table
-- Date: 2024-12-19

ALTER TABLE users 
ADD COLUMN is_whatsapp_connected BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for better query performance
CREATE INDEX ix_users_whatsapp_connected ON users(is_whatsapp_connected);

-- Update existing users to have the new column
UPDATE users SET is_whatsapp_connected = FALSE WHERE is_whatsapp_connected IS NULL; 