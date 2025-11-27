-- Migration: Add password reset fields to users table
-- This allows users to reset their password via a temporary code

ALTER TABLE users ADD COLUMN reset_code_hash TEXT;
ALTER TABLE users ADD COLUMN reset_code_expires DATETIME;
