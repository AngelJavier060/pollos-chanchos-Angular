-- Historial de ciclos donde la chancha no quedó prenada (reinicio sin parto)
CREATE TABLE IF NOT EXISTS gestacion_no_prenada (
    id                    BIGSERIAL PRIMARY KEY,
    gestacion_id          BIGINT NOT NULL REFERENCES gestacion_chancha(id) ON DELETE CASCADE,
    lote_id               VARCHAR(255) NOT NULL,
    numero_en_lote        INTEGER NOT NULL CHECK (numero_en_lote > 0),
    nombre_chancha        VARCHAR(100) NOT NULL,
    fecha_inseminacion    DATE NOT NULL,
    fecha_confirmacion    DATE NOT NULL,
    dias_gestacion        INTEGER NOT NULL DEFAULT 0,
    motivo                VARCHAR(80),
    observaciones         TEXT,
    foto_url              VARCHAR(500),
    usuario_registro      VARCHAR(255),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestacion_no_prenada_chancha
    ON gestacion_no_prenada (lote_id, numero_en_lote, fecha_confirmacion DESC);
