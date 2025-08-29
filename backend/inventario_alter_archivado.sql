-- Schema update for inventory archiving and metrics support
-- Run these on your MySQL database connected to the backend.
-- Safe to run multiple times: includes IF NOT EXISTS guards where possible.

-- 1) Add 'estado' column (ACTIVO | ARCHIVADO)
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO';

-- 2) Add 'archivado_at' timestamp column
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS archivado_at DATETIME(6) NULL;

-- 3) Add 'max_nivel' for maximum desired stock level
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS max_nivel DECIMAL(10,3) NULL;

-- Note: If your MySQL version doesn't support IF NOT EXISTS for ADD COLUMN,
-- run the following guarded variant:
--   SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
--   WHERE TABLE_NAME='inventario_alimentos' AND COLUMN_NAME='estado';
-- and only then execute the corresponding ALTER.
