-- Crear tabla para el historial de cambios en plan_ejecucion (PostgreSQL)
CREATE TABLE plan_ejecucion_historial (
    id BIGSERIAL PRIMARY KEY,
    plan_ejecucion_id BIGINT NOT NULL,
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_id BIGINT NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_plan_ejecucion_id ON plan_ejecucion_historial(plan_ejecucion_id);
CREATE INDEX idx_usuario_id ON plan_ejecucion_historial(usuario_id);
CREATE INDEX idx_fecha_cambio ON plan_ejecucion_historial(fecha_cambio);

COMMENT ON TABLE plan_ejecucion_historial IS 'Tabla para el historial de cambios en la ejecución de planes de alimentación';

-- Crear vista para consultas frecuentes de historial (sintaxis PostgreSQL)
CREATE OR REPLACE VIEW v_historial_reciente AS
SELECT
    h.id,
    h.plan_ejecucion_id,
    h.campo_modificado,
    h.valor_anterior,
    h.valor_nuevo,
    h.usuario_id,
    h.fecha_cambio,
    h.motivo,
    u.username AS usuario_nombre
FROM plan_ejecucion_historial h
LEFT JOIN users u ON h.usuario_id = u.id
WHERE h.fecha_cambio >= NOW() - INTERVAL '30 days'
ORDER BY h.fecha_cambio DESC;