-- Migración V7: Permitir valores NULL en plan_ejecucion para registros manuales
-- Esto permite crear registros de alimentación sin una asignación específica de plan

-- Modificar asignacion_id para permitir NULL
ALTER TABLE plan_ejecucion 
MODIFY COLUMN asignacion_id BIGINT NULL;

-- Modificar detalle_id para permitir NULL  
ALTER TABLE plan_ejecucion 
MODIFY COLUMN detalle_id BIGINT NULL;

-- Actualizar foreign key constraints para manejar NULLs
ALTER TABLE plan_ejecucion 
DROP FOREIGN KEY fk_plan_ejecucion_asignacion;

ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_asignacion 
FOREIGN KEY (asignacion_id) REFERENCES plan_asignacion(id) ON DELETE CASCADE;

ALTER TABLE plan_ejecucion 
DROP FOREIGN KEY fk_plan_ejecucion_detalle;

ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_detalle 
FOREIGN KEY (detalle_id) REFERENCES plan_detalle(id);

-- Agregar campos de auditoría que están en la entidad Java pero faltan en BD
ALTER TABLE plan_ejecucion 
ADD COLUMN editado BOOLEAN DEFAULT FALSE,
ADD COLUMN motivo_edicion TEXT,
ADD COLUMN editado_por BIGINT,
ADD COLUMN fecha_edicion DATETIME(6),
ADD COLUMN cantidad_original DOUBLE,
ADD COLUMN producto_original_id BIGINT;

-- Agregar foreign keys para los nuevos campos
ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_editado_por 
FOREIGN KEY (editado_por) REFERENCES usuarios(id);

ALTER TABLE plan_ejecucion 
ADD CONSTRAINT fk_plan_ejecucion_producto_original 
FOREIGN KEY (producto_original_id) REFERENCES plan_detalle(id);

-- Agregar índices para optimizar consultas
CREATE INDEX idx_plan_ejecucion_editado ON plan_ejecucion(editado);
CREATE INDEX idx_plan_ejecucion_editado_por ON plan_ejecucion(editado_por);

-- Comentario explicativo
ALTER TABLE plan_ejecucion 
COMMENT = 'Registro diario de ejecución de planes de alimentación. Permite registros manuales sin asignación específica (asignacion_id NULL)'; 