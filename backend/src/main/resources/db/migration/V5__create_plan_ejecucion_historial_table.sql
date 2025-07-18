-- Crear tabla para el historial de cambios en plan_ejecucion
CREATE TABLE plan_ejecucion_historial (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_ejecucion_id BIGINT NOT NULL,
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id BIGINT NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    INDEX idx_plan_ejecucion_id (plan_ejecucion_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_fecha_cambio (fecha_cambio)
);

-- Añadir comentarios para documentar la tabla
ALTER TABLE plan_ejecucion_historial 
COMMENT = 'Tabla para el historial de cambios en la ejecución de planes de alimentación';

-- Crear vista para consultas frecuentes de historial
CREATE VIEW v_historial_reciente AS
SELECT 
    h.id,
    h.plan_ejecucion_id,
    h.campo_modificado,
    h.valor_anterior,
    h.valor_nuevo,
    h.usuario_id,
    h.fecha_cambio,
    h.motivo,
    u.username as usuario_nombre
FROM plan_ejecucion_historial h
LEFT JOIN users u ON h.usuario_id = u.id
WHERE h.fecha_cambio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY h.fecha_cambio DESC; 