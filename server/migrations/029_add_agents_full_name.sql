-- Add full_name column to agents (legal full name of the agent owner, OCR-captured from ID)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS full_name VARCHAR(200) DEFAULT '';
