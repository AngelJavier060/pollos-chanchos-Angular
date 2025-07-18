-- PASO 1: Seleccionar la base de datos
USE db_avicola;

-- PASO 2: Modificar asignacion_id para permitir NULL
ALTER TABLE plan_ejecucion 
MODIFY COLUMN asignacion_id BIGINT NULL;

-- PASO 3: Modificar detalle_id para permitir NULL  
ALTER TABLE plan_ejecucion 
MODIFY COLUMN detalle_id BIGINT NULL;

-- PASO 4: Actualizar foreign key constraints
ALTER TABLE plan_ejecucion 
DROP FOREIGN KEY IF EXISTS fk_plan_ejecucion_asignacion;

ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_asignacion 
FOREIGN KEY (asignacion_id) REFERENCES plan_asignacion(id) ON DELETE CASCADE;

ALTER TABLE plan_ejecucion 
DROP FOREIGN KEY IF EXISTS fk_plan_ejecucion_detalle;

ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_detalle 
FOREIGN KEY (detalle_id) REFERENCES plan_detalle(id);

-- PASO 5: Agregar campos de auditoria faltantes (si no existen)
ALTER TABLE plan_ejecucion 
ADD COLUMN IF NOT EXISTS editado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS motivo_edicion TEXT,
ADD COLUMN IF NOT EXISTS editado_por BIGINT,
ADD COLUMN IF NOT EXISTS fecha_edicion DATETIME(6),
ADD COLUMN IF NOT EXISTS cantidad_original DOUBLE,
ADD COLUMN IF NOT EXISTS producto_original_id BIGINT;

-- PASO 6: Verificar que la migracion se aplico correctamente
SELECT 
    COLUMN_NAME, 
    IS_NULLABLE,
    DATA_TYPE 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'db_avicola' 
  AND TABLE_NAME = 'plan_ejecucion' 
  AND COLUMN_NAME IN ('asignacion_id', 'detalle_id');
