-- ============================================================================
-- SCRIPT DE CREACIÓN DE TABLAS PARA INVENTARIO AUTOMÁTICO
-- Sistema de Control de Stock con Deducción Automática
-- ============================================================================

-- Crear tabla de inventario de alimentos
CREATE TABLE IF NOT EXISTS `inventario_alimentos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tipo_alimento_id` bigint NOT NULL,
  `cantidad_stock` decimal(10,3) NOT NULL DEFAULT '0.000',
  `unidad_medida` varchar(10) DEFAULT 'KG',
  `stock_minimo` decimal(10,3) DEFAULT '0.000',
  `observaciones` varchar(500) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_inventario_tipo_alimento` (`tipo_alimento_id`),
  CONSTRAINT `fk_inventario_tipo_alimento` FOREIGN KEY (`tipo_alimento_id`) REFERENCES `type_foods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Crear tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS `movimientos_inventario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inventario_id` bigint NOT NULL,
  `tipo_movimiento` varchar(20) NOT NULL,
  `cantidad` decimal(10,3) NOT NULL,
  `stock_anterior` decimal(10,3) DEFAULT NULL,
  `stock_nuevo` decimal(10,3) DEFAULT NULL,
  `lote_id` varchar(36) DEFAULT NULL,
  `observaciones` varchar(500) DEFAULT NULL,
  `usuario_registro` varchar(100) DEFAULT NULL,
  `fecha_movimiento` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_movimiento_inventario` (`inventario_id`),
  KEY `idx_lote_id` (`lote_id`),
  KEY `idx_tipo_movimiento` (`tipo_movimiento`),
  KEY `idx_fecha_movimiento` (`fecha_movimiento`),
  CONSTRAINT `fk_movimiento_inventario` FOREIGN KEY (`inventario_id`) REFERENCES `inventario_alimentos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertar datos de ejemplo para inventario de alimentos
-- Obtenemos el ID del tipo de alimento "Alimento" (debe existir en type_foods)
INSERT INTO `inventario_alimentos` 
  (`tipo_alimento_id`, `cantidad_stock`, `unidad_medida`, `stock_minimo`, `observaciones`, `fecha_creacion`, `fecha_actualizacion`)
SELECT 
  tf.id,
  1000.000,
  'KG',
  50.000,
  'Stock inicial del sistema de inventario automático',
  NOW(),
  NOW()
FROM `type_foods` tf 
WHERE tf.name = 'Alimento' 
LIMIT 1;

-- Si no existe un tipo de alimento llamado "Alimento", crear uno por defecto
INSERT IGNORE INTO `type_foods` (`name`, `description`, `date_create`) 
VALUES ('Alimento', 'Alimento para animales', NOW());

-- Asegurar que hay un inventario para el tipo de alimento por defecto
INSERT INTO `inventario_alimentos` 
  (`tipo_alimento_id`, `cantidad_stock`, `unidad_medida`, `stock_minimo`, `observaciones`, `fecha_creacion`, `fecha_actualizacion`)
SELECT 
  (SELECT id FROM `type_foods` WHERE name = 'Alimento' LIMIT 1),
  1000.000,
  'KG', 
  50.000,
  'Stock inicial automatizado - Sistema de control de inventario',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `inventario_alimentos` 
  WHERE tipo_alimento_id = (SELECT id FROM `type_foods` WHERE name = 'Alimento' LIMIT 1)
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
