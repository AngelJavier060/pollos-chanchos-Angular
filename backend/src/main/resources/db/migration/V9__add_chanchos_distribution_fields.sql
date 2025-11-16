-- Migración V9: Agregar campos de distribución por sexo y propósito para chanchos
-- Fecha: 2025-01-16
-- Descripción: Agrega campos para registrar la cantidad de machos/hembras y su propósito en lotes de chanchos

ALTER TABLE lote
ADD COLUMN male_count INT NULL COMMENT 'Cantidad de machos en el lote (solo para chanchos)',
ADD COLUMN female_count INT NULL COMMENT 'Cantidad de hembras en el lote (solo para chanchos)',
ADD COLUMN male_purpose VARCHAR(50) NULL COMMENT 'Propósito de los machos: engorde, reproduccion, etc.',
ADD COLUMN female_purpose VARCHAR(50) NULL COMMENT 'Propósito de las hembras: engorde, reproduccion, etc.';

-- Índices para mejorar consultas de reportes estadísticos
CREATE INDEX idx_lote_male_purpose ON lote(male_purpose);
CREATE INDEX idx_lote_female_purpose ON lote(female_purpose);
