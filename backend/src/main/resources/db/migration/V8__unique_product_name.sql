-- Evitar nombres duplicados de productos (PostgreSQL)
-- Nota: si existen duplicados, esta migración fallará. Depura los duplicados antes de aplicarla.

-- Crear índice único en nombre de producto
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_name ON product (name);
