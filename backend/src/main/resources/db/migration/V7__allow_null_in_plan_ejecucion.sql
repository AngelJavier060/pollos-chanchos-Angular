-- Migración V7: Permitir valores NULL en plan_ejecucion para registros manuales (PostgreSQL)
-- Esto permite crear registros de alimentación sin una asignación específica de plan

-- Modificar asignacion_id para permitir NULL
ALTER TABLE plan_ejecucion
ALTER COLUMN asignacion_id DROP NOT NULL;

-- Modificar detalle_id para permitir NULL
ALTER TABLE plan_ejecucion
ALTER COLUMN detalle_id DROP NOT NULL;

-- Actualizar foreign key constraints para manejar NULLs
ALTER TABLE plan_ejecucion
DROP CONSTRAINT IF EXISTS fk_plan_ejecucion_asignacion;

ALTER TABLE plan_ejecucion
ADD CONSTRAINT fk_plan_ejecucion_asignacion
FOREIGN KEY (asignacion_id) REFERENCES plan_asignacion(id) ON DELETE CASCADE;

ALTER TABLE plan_ejecucion
DROP CONSTRAINT IF EXISTS fk_plan_ejecucion_detalle;

ALTER TABLE plan_ejecucion
ADD CONSTRAINT fk_plan_ejecucion_detalle
FOREIGN KEY (detalle_id) REFERENCES plan_detalle(id);

-- Agregar campos de auditoría que están en la entidad Java pero faltan en BD
ALTER TABLE plan_ejecucion
ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS motivo_edicion TEXT,
ADD COLUMN IF NOT EXISTS editado_por BIGINT,
ADD COLUMN IF NOT EXISTS fecha_edicion TIMESTAMP,
ADD COLUMN IF NOT EXISTS cantidad_original DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS producto_original_id BIGINT;

-- Agregar foreign keys para los nuevos campos
ALTER TABLE plan_ejecucion
ADD CONSTRAINT fk_plan_ejecucion_editado_por
FOREIGN KEY (editado_por) REFERENCES usuarios(id);

ALTER TABLE plan_ejecucion
ADD CONSTRAINT fk_plan_ejecucion_producto_original
FOREIGN KEY (producto_original_id) REFERENCES plan_detalle(id);

-- Agregar índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_plan_ejecucion_editado ON plan_ejecucion(editado);
CREATE INDEX IF NOT EXISTS idx_plan_ejecucion_editado_por ON plan_ejecucion(editado_por);

-- Comentario explicativo
COMMENT ON TABLE plan_ejecucion IS 'Registro diario de ejecución de planes de alimentación. Permite registros manuales sin asignación específica (asignacion_id NULL)';