-- =====================================================
-- MIGRACIÓN FEFO ESTRICTO - INVENTARIO DE ALIMENTOS
-- =====================================================
-- Fecha: 2025-11-16
-- Propósito: Consolidar todo el stock en inventario_entrada_producto
--           para tener una ÚNICA fuente de verdad con trazabilidad FEFO
-- =====================================================

-- Desactivar safe update mode temporalmente
SET SQL_SAFE_UPDATES = 0;

-- PASO 0: RESPALDO DE SEGURIDAD (RECOMENDADO)
-- Ejecuta esto primero si quieres un respaldo rápido:
-- CREATE TABLE inventario_producto_backup AS SELECT * FROM inventario_producto;
-- CREATE TABLE inventario_entrada_producto_backup AS SELECT * FROM inventario_entrada_producto;
-- CREATE TABLE movimiento_inventario_producto_backup AS SELECT * FROM movimiento_inventario_producto;

-- =====================================================
-- PARTE 1: DIAGNÓSTICO INICIAL
-- =====================================================
SELECT '=== DIAGNÓSTICO INICIAL ===' AS Paso;

-- 1.1 Stock consolidado por producto
SELECT 
    'Stock Consolidado' AS Tipo,
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS StockConsolidado,
    p.quantity AS ProductQuantity
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM type_food tf 
      WHERE tf.id = p.type_food_id 
      AND (tf.controla_stock IS NULL OR tf.controla_stock = TRUE)
  )
ORDER BY p.name;

-- 1.2 Stock en entradas FEFO
SELECT 
    'Stock FEFO' AS Tipo,
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(SUM(iep.stock_base_restante), 0) AS StockEnEntradas,
    COUNT(iep.id) AS NumeroEntradas
FROM product p
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
    AND (iep.activo IS NULL OR iep.activo = TRUE)
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
GROUP BY p.id, p.name
ORDER BY p.name;

-- 1.3 Detectar discrepancias
SELECT 
    'Discrepancias' AS Tipo,
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS Consolidado,
    COALESCE(SUM(iep.stock_base_restante), 0) AS EnEntradas,
    COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0) AS Diferencia
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
    AND (iep.activo IS NULL OR iep.activo = TRUE)
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
GROUP BY p.id, p.name, ip.cantidad_stock
HAVING ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) > 0.01
ORDER BY ABS(Diferencia) DESC;

-- =====================================================
-- PARTE 2: MIGRACIÓN DE STOCK FALTANTE
-- =====================================================
SELECT '=== INICIANDO MIGRACIÓN ===' AS Paso;

-- 2.1 Crear entradas FEFO para productos que tienen stock consolidado pero NO entradas

INSERT INTO inventario_entrada_producto (
    product_id,
    provider_id,
    codigo_lote,
    fecha_ingreso,
    fecha_vencimiento,
    unidad_control,
    contenido_por_unidad,
    cantidad_unidades,
    costo_unitario_base,
    costo_por_unidad_control,
    stock_unidades_restantes,
    stock_base_restante,
    activo,
    observaciones
)
SELECT 
    p.id AS product_id,
    (SELECT pr.id FROM provider pr LIMIT 1) AS provider_id,
    CONCAT('MIG-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', p.id) AS codigo_lote,
    NOW() AS fecha_ingreso,
    NULL AS fecha_vencimiento, -- Sin vencimiento para stock migrado
    COALESCE(um.name, 'kg') AS unidad_control,
    1.0 AS contenido_por_unidad,
    COALESCE(ip.cantidad_stock, 0) AS cantidad_unidades,
    NULL AS costo_unitario_base,
    NULL AS costo_por_unidad_control,
    COALESCE(ip.cantidad_stock, 0) AS stock_unidades_restantes,
    COALESCE(ip.cantidad_stock, 0) AS stock_base_restante,
    TRUE AS activo,
    CONCAT('Migración FEFO: Stock consolidado trasladado a sistema de entradas. Stock original: ', 
           COALESCE(ip.cantidad_stock, 0), ' ', COALESCE(um.name, 'kg')) AS observaciones
FROM product p
INNER JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN unit_measurement um ON um.id = p.unit_measurement_id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND COALESCE(ip.cantidad_stock, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM inventario_entrada_producto iep
      WHERE iep.product_id = p.id
        AND (iep.activo IS NULL OR iep.activo = TRUE)
        AND iep.stock_base_restante > 0
  )
  AND EXISTS (
      SELECT 1 FROM type_food tf 
      WHERE tf.id = p.type_food_id 
      AND (tf.controla_stock IS NULL OR tf.controla_stock = TRUE)
  );

-- 2.2 Registrar movimiento de entrada en historial
-- OMITIDO: La tabla movimiento_inventario_producto no existe en esta BD
-- Esto no es crítico para la migración, solo es para historial
/*
INSERT INTO movimiento_inventario_producto (
    inventario_producto_id,
    tipo_movimiento,
    cantidad,
    costo_unitario,
    costo_total,
    stock_anterior,
    stock_nuevo,
    lote_id,
    usuario_registro,
    observaciones,
    fecha_movimiento
)
SELECT 
    ip.id AS inventario_producto_id,
    'ENTRADA' AS tipo_movimiento,
    COALESCE(ip.cantidad_stock, 0) AS cantidad,
    NULL AS costo_unitario,
    NULL AS costo_total,
    0 AS stock_anterior,
    COALESCE(ip.cantidad_stock, 0) AS stock_nuevo,
    NULL AS lote_id,
    'Sistema-Migracion' AS usuario_registro,
    CONCAT('Migración FEFO: Registro histórico de stock consolidado existente. Producto: ', p.name) AS observaciones,
    NOW() AS fecha_movimiento
FROM product p
INNER JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND COALESCE(ip.cantidad_stock, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM movimiento_inventario_producto mip
      WHERE mip.inventario_producto_id = ip.id
        AND mip.observaciones LIKE '%Migración FEFO%'
  )
  AND EXISTS (
      SELECT 1 FROM type_food tf 
      WHERE tf.id = p.type_food_id 
      AND (tf.controla_stock IS NULL OR tf.controla_stock = TRUE)
  );
*/
SELECT 'Sección 2.2 omitida: tabla movimiento_inventario_producto no existe' AS Nota;

-- =====================================================
-- PARTE 3: AJUSTAR ENTRADAS EXISTENTES CON DIFERENCIAS
-- =====================================================
SELECT '=== AJUSTANDO ENTRADAS EXISTENTES ===' AS Paso;

-- 3.1 Para productos que SÍ tienen entradas pero la suma no coincide con consolidado
-- Crear entrada de ajuste

INSERT INTO inventario_entrada_producto (
    product_id,
    provider_id,
    codigo_lote,
    fecha_ingreso,
    fecha_vencimiento,
    unidad_control,
    contenido_por_unidad,
    cantidad_unidades,
    costo_unitario_base,
    costo_por_unidad_control,
    stock_unidades_restantes,
    stock_base_restante,
    activo,
    observaciones
)
SELECT 
    p.id AS product_id,
    (SELECT pr.id FROM provider pr LIMIT 1) AS provider_id,
    CONCAT('AJUSTE-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '-', p.id) AS codigo_lote,
    NOW() AS fecha_ingreso,
    NULL AS fecha_vencimiento,
    COALESCE(um.name, 'kg') AS unidad_control,
    1.0 AS contenido_por_unidad,
    diferencia AS cantidad_unidades,
    NULL AS costo_unitario_base,
    NULL AS costo_por_unidad_control,
    diferencia AS stock_unidades_restantes,
    diferencia AS stock_base_restante,
    TRUE AS activo,
    CONCAT('Ajuste FEFO: Diferencia detectada entre consolidado (', 
           COALESCE(ip.cantidad_stock, 0), ') y entradas (', 
           COALESCE(suma_entradas, 0), '). Diferencia: ', diferencia, ' ', COALESCE(um.name, 'kg')) AS observaciones
FROM (
    SELECT 
        p.id,
        p.name,
        p.unit_measurement_id,
        COALESCE(ip.cantidad_stock, 0) AS stock_consolidado,
        COALESCE(SUM(iep.stock_base_restante), 0) AS suma_entradas,
        COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0) AS diferencia,
        ip.id AS inventario_id
    FROM product p
    LEFT JOIN inventario_producto ip ON ip.product_id = p.id
    LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
        AND (iep.activo IS NULL OR iep.activo = TRUE)
    WHERE p.active = TRUE
      AND p.type_food_id IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM inventario_entrada_producto iep2
          WHERE iep2.product_id = p.id
            AND (iep2.activo IS NULL OR iep2.activo = TRUE)
      )
    GROUP BY p.id, p.name, p.unit_measurement_id, ip.cantidad_stock, ip.id
    HAVING ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) > 0.01
) AS discrepancias
INNER JOIN product p ON p.id = discrepancias.id
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN unit_measurement um ON um.id = p.unit_measurement_id
WHERE diferencia > 0.01; -- Solo crear ajustes positivos

-- =====================================================
-- PARTE 4: LIMPIAR ENTRADAS NEGATIVAS O INCORRECTAS
-- =====================================================
SELECT '=== LIMPIANDO DATOS INCONSISTENTES ===' AS Paso;

-- 4.1 Marcar como inactivas las entradas con stock negativo
UPDATE inventario_entrada_producto
SET activo = FALSE,
    observaciones = CONCAT(COALESCE(observaciones, ''), ' | Desactivada por stock negativo en migración FEFO')
WHERE stock_base_restante < 0;

-- 4.2 Ajustar entradas con stock_base_restante > cantidad_unidades (inconsistencia)
UPDATE inventario_entrada_producto
SET stock_base_restante = cantidad_unidades,
    observaciones = CONCAT(COALESCE(observaciones, ''), ' | Ajustada por inconsistencia: stockBase > cantidadTotal')
WHERE stock_base_restante > cantidad_unidades
  AND (activo IS NULL OR activo = TRUE);

-- =====================================================
-- PARTE 5: VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================
SELECT '=== VERIFICACIÓN POST-MIGRACIÓN ===' AS Paso;

-- 5.1 Comparación final
SELECT 
    'Verificación Final' AS Tipo,
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS StockConsolidado,
    COALESCE(SUM(iep.stock_base_restante), 0) AS StockEnEntradas,
    COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0) AS Diferencia,
    CASE 
        WHEN ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) <= 0.01 
        THEN '✅ OK'
        ELSE '❌ REVISAR'
    END AS Estado
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
    AND (iep.activo IS NULL OR iep.activo = TRUE)
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
GROUP BY p.id, p.name, ip.cantidad_stock
ORDER BY ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) DESC;

-- 5.2 Resumen de entradas creadas
SELECT 
    'Entradas Creadas' AS Tipo,
    COUNT(*) AS Total,
    SUM(stock_base_restante) AS StockTotal
FROM inventario_entrada_producto
WHERE observaciones LIKE '%Migración FEFO%'
   OR observaciones LIKE '%Ajuste FEFO%';

-- 5.3 Productos sin entradas (debe estar vacío)
SELECT 
    'Productos sin Entradas' AS Tipo,
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS StockConsolidado
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND COALESCE(ip.cantidad_stock, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM inventario_entrada_producto iep
      WHERE iep.product_id = p.id
        AND (iep.activo IS NULL OR iep.activo = TRUE)
        AND iep.stock_base_restante > 0
  )
ORDER BY p.name;

-- =====================================================
-- PARTE 6: ESTADÍSTICAS FINALES
-- =====================================================
SELECT '=== ESTADÍSTICAS FINALES ===' AS Paso;

SELECT 
    COUNT(DISTINCT p.id) AS TotalProductos,
    SUM(COALESCE(ip.cantidad_stock, 0)) AS StockConsolidadoTotal,
    (SELECT SUM(stock_base_restante) 
     FROM inventario_entrada_producto 
     WHERE activo IS NULL OR activo = TRUE) AS StockEnEntradasTotal,
    COUNT(DISTINCT CASE 
        WHEN ABS(COALESCE(ip.cantidad_stock, 0) - 
                 COALESCE((SELECT SUM(iep.stock_base_restante) 
                          FROM inventario_entrada_producto iep 
                          WHERE iep.product_id = p.id 
                            AND (iep.activo IS NULL OR iep.activo = TRUE)), 0)) <= 0.01 
        THEN p.id 
    END) AS ProductosConsolidados,
    COUNT(DISTINCT CASE 
        WHEN ABS(COALESCE(ip.cantidad_stock, 0) - 
                 COALESCE((SELECT SUM(iep.stock_base_restante) 
                          FROM inventario_entrada_producto iep 
                          WHERE iep.product_id = p.id 
                            AND (iep.activo IS NULL OR iep.activo = TRUE)), 0)) > 0.01 
        THEN p.id 
    END) AS ProductosConDiscrepancia
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL;

-- =====================================================
-- PARTE 7: SCRIPT DE ROLLBACK (SI ALGO SALE MAL)
-- =====================================================
/*
-- SOLO EJECUTAR SI NECESITAS REVERTIR LA MIGRACIÓN

-- Eliminar entradas creadas por migración
DELETE FROM inventario_entrada_producto 
WHERE observaciones LIKE '%Migración FEFO%'
   OR observaciones LIKE '%Ajuste FEFO%';

-- Eliminar movimientos de migración
DELETE FROM movimiento_inventario_producto
WHERE observaciones LIKE '%Migración FEFO%';

-- Restaurar desde backup (si creaste las tablas de backup)
-- TRUNCATE TABLE inventario_producto;
-- INSERT INTO inventario_producto SELECT * FROM inventario_producto_backup;
-- TRUNCATE TABLE inventario_entrada_producto;
-- INSERT INTO inventario_entrada_producto SELECT * FROM inventario_entrada_producto_backup;

*/

SELECT '=== MIGRACIÓN COMPLETADA ===' AS Paso;
SELECT 'Revisa las tablas de verificación arriba. Si todo está OK, procede al Paso 2 del backend.' AS Instrucciones;

-- Reactivar safe update mode
SET SQL_SAFE_UPDATES = 1;
