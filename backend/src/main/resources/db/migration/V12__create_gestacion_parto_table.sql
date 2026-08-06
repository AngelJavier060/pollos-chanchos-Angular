-- Historial de partos por chancha (ciclos de gestación cerrados)
CREATE TABLE IF NOT EXISTS gestacion_parto (
    id                  BIGSERIAL PRIMARY KEY,
    gestacion_id        BIGINT NOT NULL REFERENCES gestacion_chancha(id) ON DELETE CASCADE,
    lote_id             VARCHAR(255) NOT NULL,
    numero_en_lote      INTEGER NOT NULL CHECK (numero_en_lote > 0),
    nombre_chancha      VARCHAR(100) NOT NULL,
    numero_parto        INTEGER NOT NULL CHECK (numero_parto >= 1),
    fecha_parto         DATE NOT NULL,
    lechones_nacidos    INTEGER NOT NULL DEFAULT 0 CHECK (lechones_nacidos >= 0),
    lechones_vivos      INTEGER NOT NULL DEFAULT 0 CHECK (lechones_vivos >= 0),
    lechones_muertos    INTEGER NOT NULL DEFAULT 0 CHECK (lechones_muertos >= 0),
    observaciones       TEXT,
    usuario_registro    VARCHAR(255),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestacion_parto_chancha
    ON gestacion_parto (lote_id, numero_en_lote, numero_parto);

CREATE INDEX IF NOT EXISTS idx_gestacion_parto_gestacion
    ON gestacion_parto (gestacion_id);
