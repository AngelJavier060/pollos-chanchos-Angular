-- Schema update for inventory archiving and metrics support
-- Run these on your PostgreSQL database connected to the backend.
-- Safe to run multiple times: includes IF NOT EXISTS guards where possible.

-- 1) Add 'estado' column (ACTIVO | ARCHIVADO)
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO';

-- 2) Add 'archivado_at' timestamp column
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS archivado_at TIMESTAMP NULL;

-- 3) Add 'max_nivel' for maximum desired stock level
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS max_nivel DECIMAL(10,3) NULL;

-- Note: PostgreSQL supports IF NOT EXISTS for ADD COLUMN natively.
-- If running on an older PostgreSQL version (<9.6), remove IF NOT EXISTS
-- and guard manually with:
--   SELECT 1 FROM information_schema.columns
--   WHERE table_name='inventario_alimentos' AND column_name='estado';
