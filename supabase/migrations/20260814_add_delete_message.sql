-- Migration: Add soft-delete support for chat messages
-- Adds deleted_at column to family_messages and thought_messages

-- Family chat messages
ALTER TABLE family_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Thought/confession messages
ALTER TABLE thought_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
