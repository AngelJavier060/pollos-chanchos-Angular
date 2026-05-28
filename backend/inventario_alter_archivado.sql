-- ============================================================================
-- Actualización de esquema: soporte de archivado y métricas de inventario
-- Base de datos: PostgreSQL
-- Seguro de ejecutar varias veces: usa IF NOT EXISTS.
-- ============================================================================

-- 1) Columna 'estado' (ACTIVO | ARCHIVADO)
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'ACTIVO';

-- 2) Columna 'archivado_at' (fecha/hora de archivado)
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS archivado_at TIMESTAMP NULL;

-- 3) Columna 'max_nivel' (nivel máximo de stock deseado)
ALTER TABLE inventario_alimentos
    ADD COLUMN IF NOT EXISTS max_nivel DECIMAL(10,3) NULL;

-- Nota: PostgreSQL soporta IF NOT EXISTS para ADD COLUMN de forma nativa.
-- Si usas una versión antigua (<9.6), quita IF NOT EXISTS y verifica antes con:
--   SELECT 1 FROM information_schema.columns
--   WHERE table_name='inventario_alimentos' AND column_name='estado';
