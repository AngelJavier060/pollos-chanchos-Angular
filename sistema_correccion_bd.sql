-- ===============================================
-- SCRIPT: Sistema de Corrección y Auditoría
-- Fecha: 2025-07-06
-- Propósito: Agregar campos y tablas para correcciones y historial
-- ===============================================

USE db_avicola;

-- 1. Agregar campos de auditoría a plan_ejecucion
ALTER TABLE plan_ejecucion 
ADD COLUMN editado BOOLEAN DEFAULT FALSE,
ADD COLUMN motivo_edicion TEXT,
ADD COLUMN editado_por INT,
ADD COLUMN fecha_edicion DATETIME,
ADD COLUMN cantidad_original DECIMAL(10,3),
ADD COLUMN producto_original_id INT;

-- 2. Crear tabla de historial de cambios
CREATE TABLE plan_ejecucion_historial (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_ejecucion_id INT NOT NULL,
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id INT NOT NULL,
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (plan_ejecucion_id) REFERENCES plan_ejecucion(id) ON DELETE CASCADE,
    INDEX idx_plan_ejecucion_id (plan_ejecucion_id),
    INDEX idx_fecha_cambio (fecha_cambio)
);

-- 3. Crear tabla de validaciones y límites
CREATE TABLE validaciones_alimentacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo_animal VARCHAR(20) NOT NULL,
    etapa VARCHAR(50) NOT NULL,
    cantidad_minima_por_animal DECIMAL(8,3) NOT NULL,
    cantidad_maxima_por_animal DECIMAL(8,3) NOT NULL,
    porcentaje_alerta_minimo DECIMAL(5,2) DEFAULT 80.00,
    porcentaje_alerta_maximo DECIMAL(5,2) DEFAULT 120.00,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Insertar validaciones por defecto para pollos
INSERT INTO validaciones_alimentacion (tipo_animal, etapa, cantidad_minima_por_animal, cantidad_maxima_por_animal) VALUES
('pollos', 'Inicial', 0.030, 0.070),
('pollos', 'Crecimiento', 0.080, 0.160),
('pollos', 'Acabado', 0.140, 0.220);

-- 5. Insertar validaciones por defecto para chanchos
INSERT INTO validaciones_alimentacion (tipo_animal, etapa, cantidad_minima_por_animal, cantidad_maxima_por_animal) VALUES
('chanchos', 'Inicial', 0.200, 0.400),
('chanchos', 'Crecimiento', 0.800, 1.500),
('chanchos', 'Acabado', 1.500, 2.500);

-- 6. Crear tabla de permisos de corrección
CREATE TABLE permisos_correccion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    puede_corregir BOOLEAN DEFAULT FALSE,
    limite_horas_correccion INT DEFAULT 24,
    puede_ver_historial BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Dar permisos de corrección al usuario admin (ID 1 por defecto)
INSERT INTO permisos_correccion (usuario_id, puede_corregir, limite_horas_correccion) VALUES
(1, TRUE, 48);

-- 8. Crear índices para mejor rendimiento
CREATE INDEX idx_plan_ejecucion_editado ON plan_ejecucion(editado);
CREATE INDEX idx_plan_ejecucion_fecha_suministro ON plan_ejecucion(fecha_suministro);
CREATE INDEX idx_validaciones_tipo_etapa ON validaciones_alimentacion(tipo_animal, etapa);

-- 9. Crear vista para consultas rápidas de historial
CREATE VIEW vista_historial_alimentacion AS
SELECT 
    pe.id,
    pe.fecha_suministro,
    l.codigo as lote_codigo,
    l.tipo_animal,
    p.name as producto_nombre,
    pe.cantidad_suministrada,
    pe.editado,
    pe.motivo_edicion,
    pe.fecha_edicion,
    pe.cantidad_original,
    po.name as producto_original_nombre,
    CASE 
        WHEN pe.editado = TRUE THEN 'Editado'
        ELSE 'Original'
    END as estado_registro
FROM plan_ejecucion pe
JOIN lotes l ON pe.lote_id = l.id
JOIN products p ON pe.producto_id = p.id
LEFT JOIN products po ON pe.producto_original_id = po.id
ORDER BY pe.fecha_suministro DESC, pe.created_at DESC;

COMMIT;

-- Mostrar resumen de cambios
SELECT 'TABLAS CREADAS/MODIFICADAS:' as resumen;
SELECT 'plan_ejecucion - Campos de auditoría agregados' as detalle
UNION ALL
SELECT 'plan_ejecucion_historial - Nueva tabla para historial'
UNION ALL  
SELECT 'validaciones_alimentacion - Nueva tabla para límites'
UNION ALL
SELECT 'permisos_correccion - Nueva tabla para permisos'
UNION ALL
SELECT 'vista_historial_alimentacion - Vista para consultas';

-- Verificar que las validaciones se insertaron
SELECT * FROM validaciones_alimentacion;
