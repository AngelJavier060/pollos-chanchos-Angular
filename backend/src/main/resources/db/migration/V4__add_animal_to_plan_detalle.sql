-- Agregar campo animal_id a la tabla plan_detalle
-- V4__add_animal_to_plan_detalle.sql

-- Agregar columna animal_id como opcional inicialmente
ALTER TABLE plan_detalle 
ADD COLUMN animal_id BIGINT;

-- Agregar índice para optimizar consultas
CREATE INDEX idx_plan_detalle_animal ON plan_detalle(animal_id);

-- Agregar foreign key constraint
ALTER TABLE plan_detalle 
ADD CONSTRAINT fk_plan_detalle_animal 
FOREIGN KEY (animal_id) REFERENCES animal(id);

-- Comentario explicativo
COMMENT ON COLUMN plan_detalle.animal_id IS 'ID del animal para el cual está diseñada esta etapa de crecimiento (pollo, chancho, etc.)'; 