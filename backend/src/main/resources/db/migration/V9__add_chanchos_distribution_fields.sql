-- Migración V9: Agregar campos de distribución por sexo y propósito para chanchos (PostgreSQL)
-- Fecha: 2025-01-16
-- Descripción: Agrega campos para registrar la cantidad de machos/hembras y su propósito en lotes de chanchos

ALTER TABLE lote
ADD COLUMN IF NOT EXISTS male_count INT NULL,
ADD COLUMN IF NOT EXISTS female_count INT NULL,
ADD COLUMN IF NOT EXISTS male_purpose VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS female_purpose VARCHAR(50) NULL;

COMMENT ON COLUMN lote.male_count IS 'Cantidad de machos en el lote (solo para chanchos)';
COMMENT ON COLUMN lote.female_count IS 'Cantidad de hembras en el lote (solo para chanchos)';
COMMENT ON COLUMN lote.male_purpose IS 'Propósito de los machos: engorde, reproduccion, etc.';
COMMENT ON COLUMN lote.female_purpose IS 'Propósito de las hembras: engorde, reproduccion, etc.';

-- Índices para mejorar consultas de reportes estadísticos
CREATE INDEX IF NOT EXISTS idx_lote_male_purpose ON lote(male_purpose);
CREATE INDEX IF NOT EXISTS idx_lote_female_purpose ON lote(female_purpose);
