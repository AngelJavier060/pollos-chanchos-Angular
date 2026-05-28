-- ============================================================================
-- SCRIPT DE CREACIÓN DE TABLAS PARA INVENTARIO AUTOMÁTICO
-- Sistema de Control de Stock con Deducción Automática
-- ============================================================================

-- Crear tabla de inventario de alimentos
CREATE TABLE IF NOT EXISTS inventario_alimentos (
  id BIGSERIAL PRIMARY KEY,
  tipo_alimento_id BIGINT NOT NULL,
  cantidad_stock DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  unidad_medida VARCHAR(10) DEFAULT 'KG',
  stock_minimo DECIMAL(10,3) DEFAULT 0.000,
  observaciones VARCHAR(500) DEFAULT NULL,
  fecha_creacion TIMESTAMP DEFAULT NULL,
  fecha_actualizacion TIMESTAMP DEFAULT NULL,
  CONSTRAINT fk_inventario_tipo_alimento FOREIGN KEY (tipo_alimento_id) REFERENCES type_foods (id)
);
CREATE INDEX IF NOT EXISTS idx_inv_tipo_alimento ON inventario_alimentos(tipo_alimento_id);

-- Crear tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id BIGSERIAL PRIMARY KEY,
  inventario_id BIGINT NOT NULL,
  tipo_movimiento VARCHAR(20) NOT NULL,
  cantidad DECIMAL(10,3) NOT NULL,
  stock_anterior DECIMAL(10,3) DEFAULT NULL,
  stock_nuevo DECIMAL(10,3) DEFAULT NULL,
  lote_id VARCHAR(36) DEFAULT NULL,
  observaciones VARCHAR(500) DEFAULT NULL,
  usuario_registro VARCHAR(100) DEFAULT NULL,
  fecha_movimiento TIMESTAMP DEFAULT NULL,
  CONSTRAINT fk_movimiento_inventario FOREIGN KEY (inventario_id) REFERENCES inventario_alimentos (id)
);
CREATE INDEX IF NOT EXISTS idx_mov_inventario ON movimientos_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_lote_id ON movimientos_inventario(lote_id);
CREATE INDEX IF NOT EXISTS idx_tipo_movimiento ON movimientos_inventario(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_fecha_movimiento ON movimientos_inventario(fecha_movimiento);

-- Insertar datos de ejemplo para inventario de alimentos
-- Obtenemos el ID del tipo de alimento "Alimento" (debe existir en type_foods)
INSERT INTO inventario_alimentos
  (tipo_alimento_id, cantidad_stock, unidad_medida, stock_minimo, observaciones, fecha_creacion, fecha_actualizacion)
SELECT
  tf.id,
  1000.000,
  'KG',
  50.000,
  'Stock inicial del sistema de inventario automático',
  NOW(),
  NOW()
FROM type_foods tf
WHERE tf.name = 'Alimento'
LIMIT 1;

-- Si no existe un tipo de alimento llamado "Alimento", crear uno por defecto
INSERT INTO type_foods (name, description, date_create)
VALUES ('Alimento', 'Alimento para animales', NOW())
ON CONFLICT DO NOTHING;

-- Asegurar que hay un inventario para el tipo de alimento por defecto
INSERT INTO inventario_alimentos
  (tipo_alimento_id, cantidad_stock, unidad_medida, stock_minimo, observaciones, fecha_creacion, fecha_actualizacion)
SELECT
  (SELECT id FROM type_foods WHERE name = 'Alimento' LIMIT 1),
  1000.000,
  'KG',
  50.000,
  'Stock inicial automatizado - Sistema de control de inventario',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM inventario_alimentos
  WHERE tipo_alimento_id = (SELECT id FROM type_foods WHERE name = 'Alimento' LIMIT 1)
);

-- Verificar datos insertados
SELECT 'VERIFICACIÓN DE TABLAS CREADAS:' as status;
SELECT COUNT(*) as total_inventarios FROM inventario_alimentos;
SELECT COUNT(*) as total_movimientos FROM movimientos_inventario;

-- Mostrar inventarios disponibles
SELECT
  ia.id,
  tf.name as tipo_alimento,
  ia.cantidad_stock,
  ia.unidad_medida,
  ia.stock_minimo,
  ia.fecha_creacion
FROM inventario_alimentos ia
JOIN type_foods tf ON ia.tipo_alimento_id = tf.id;

-- Mensaje final
SELECT '✅ TABLAS DE INVENTARIO CREADAS EXITOSAMENTE' as resultado;
SELECT 'Ahora puede probar el sistema de inventario automático' as instrucciones;
