-- Crear tabla de validaciones y límites de alimentación (PostgreSQL)
CREATE TABLE validaciones_alimentacion (
    id BIGSERIAL PRIMARY KEY,
    tipo_animal VARCHAR(20) NOT NULL,
    etapa VARCHAR(50) NOT NULL,
    cantidad_minima_por_animal DECIMAL(8,3) NOT NULL,
    cantidad_maxima_por_animal DECIMAL(8,3) NOT NULL,
    porcentaje_alerta_minimo DECIMAL(5,2) DEFAULT 80.00,
    porcentaje_alerta_maximo DECIMAL(5,2) DEFAULT 120.00,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tipo_animal ON validaciones_alimentacion(tipo_animal);
CREATE INDEX idx_etapa ON validaciones_alimentacion(etapa);
CREATE INDEX idx_validaciones_tipo_etapa ON validaciones_alimentacion(tipo_animal, etapa);

-- Insertar validaciones por defecto para pollos
INSERT INTO validaciones_alimentacion (tipo_animal, etapa, cantidad_minima_por_animal, cantidad_maxima_por_animal) VALUES
('pollos', 'Inicial', 0.030, 0.070),
('pollos', 'Crecimiento', 0.080, 0.160),
('pollos', 'Acabado', 0.140, 0.220);

-- Insertar validaciones por defecto para chanchos
INSERT INTO validaciones_alimentacion (tipo_animal, etapa, cantidad_minima_por_animal, cantidad_maxima_por_animal) VALUES
('chanchos', 'Inicial', 0.200, 0.400),
('chanchos', 'Crecimiento', 0.800, 1.500),
('chanchos', 'Acabado', 1.500, 2.500);

COMMENT ON TABLE validaciones_alimentacion IS 'Tabla para validaciones y límites de alimentación por tipo de animal y etapa';