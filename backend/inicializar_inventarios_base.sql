-- ============================================================================
-- SCRIPT PARA INICIALIZAR INVENTARIOS BASE
-- Crea registros de inventario seguros para tipos de alimento existentes
-- ============================================================================

-- Verificar tipos de alimento existentes
SELECT 'TIPOS DE ALIMENTO DISPONIBLES:' as info;
SELECT id, name FROM type_foods ORDER BY name;

-- ============================================================================
-- CREAR INVENTARIOS BASE PARA EVITAR CREACIÓN DINÁMICA PROBLEMÁTICA
-- ============================================================================

-- Crear inventario_alimentos para cada tipo de alimento que no lo tenga
INSERT INTO inventario_alimentos (tipo_alimento_id, cantidad_stock, unidad_medida, stock_minimo, observaciones, fecha_creacion, fecha_actualizacion)
SELECT 
    tf.id as tipo_alimento_id,
    0.000 as cantidad_stock,
    'KG' as unidad_medida,
    0.000 as stock_minimo,
    CONCAT('Inventario base creado automáticamente para: ', tf.name) as observaciones,
    NOW() as fecha_creacion,
    NOW() as fecha_actualizacion
FROM type_foods tf
WHERE NOT EXISTS (
    SELECT 1 FROM inventario_alimentos ia 
    WHERE ia.tipo_alimento_id = tf.id
);

-- ============================================================================
-- CREAR INVENTARIOS DE PRODUCTO PARA PRODUCTOS SIN INVENTARIO
-- ============================================================================

-- Crear inventario_producto para cada producto que no lo tenga
INSERT INTO inventario_producto (product_id, cantidad_stock, unidad_medida, stock_minimo, costo_unitario_promedio, activo, fecha_creacion, fecha_actualizacion)
SELECT 
    p.id as product_id,
    p.quantity as cantidad_stock, -- Usar la cantidad inicial del producto
    COALESCE(um.name, 'KG') as unidad_medida,
    0.000 as stock_minimo,
    COALESCE(p.price_unit, 0.000) as costo_unitario_promedio,
    true as activo,
    NOW() as fecha_creacion,
    NOW() as fecha_actualizacion
FROM product p
LEFT JOIN unit_measurement um ON p.unitMeasurement_id = um.id
WHERE NOT EXISTS (
    SELECT 1 FROM inventario_producto ip 
    WHERE ip.product_id = p.id
);

-- ============================================================================
-- VERIFICACIÓN Y REPORTE
-- ============================================================================

SELECT 'INVENTARIOS CREADOS EXITOSAMENTE:' as resultado;

-- Mostrar inventarios de alimentos
SELECT 
    ia.id,
    tf.name as tipo_alimento,
    ia.cantidad_stock,
    ia.unidad_medida,
    ia.stock_minimo
FROM inventario_alimentos ia
JOIN type_foods tf ON ia.tipo_alimento_id = tf.id
ORDER BY tf.name;

-- Mostrar inventarios de productos (primeros 10)
SELECT 
    ip.id,
    p.name as producto,
    ip.cantidad_stock,
    ip.unidad_medida,
    ip.stock_minimo,
    ip.activo
FROM inventario_producto ip
JOIN product p ON ip.product_id = p.id
ORDER BY p.name
LIMIT 10;

-- Contar registros
SELECT 
    (SELECT COUNT(*) FROM inventario_alimentos) as total_inventarios_alimentos,
    (SELECT COUNT(*) FROM inventario_producto) as total_inventarios_productos,
    (SELECT COUNT(*) FROM type_foods) as total_tipos_alimento,
    (SELECT COUNT(*) FROM product) as total_productos;

SELECT '✅ INICIALIZACIÓN COMPLETADA - Sistema listo para funcionar' as estado_final;