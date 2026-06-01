-- Registro de gestación por chancha (vinculado a lote + número en lote)
CREATE TABLE gestacion_chancha (
    id BIGSERIAL PRIMARY KEY,
    lote_id VARCHAR(255) NOT NULL,
    numero_en_lote INTEGER NOT NULL CHECK (numero_en_lote > 0),
    nombre VARCHAR(100) NOT NULL,
    raza VARCHAR(150),
    fecha_inseminacion DATE NOT NULL,
    numero_parto INTEGER NOT NULL DEFAULT 1 CHECK (numero_parto > 0),
    observaciones TEXT,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    lote_codigo VARCHAR(50),
    lote_nombre VARCHAR(255),
    usuario_registro VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gestacion_lote ON gestacion_chancha(lote_id);
CREATE INDEX idx_gestacion_fecha ON gestacion_chancha(fecha_inseminacion);
CREATE INDEX idx_gestacion_activa ON gestacion_chancha(activa);

-- Solo una chancha activa por cupo (lote + número)
CREATE UNIQUE INDEX uq_gestacion_lote_numero_activa
    ON gestacion_chancha (lote_id, numero_en_lote)
    WHERE activa = TRUE;

COMMENT ON TABLE gestacion_chancha IS 'Control de gestación por cerda/chancha dentro de un lote';
