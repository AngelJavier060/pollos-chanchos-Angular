# QA E2E Inventario FEFO, Entradas y Alertas

Este documento guía pruebas end-to-end para validar el nuevo flujo de Entradas por producto, consumo FEFO y alertas de vencimiento.

## Precondiciones
- Backend en marcha en http://localhost:8088
- Frontend en marcha en http://localhost:4200
- Tipos de producto (`TypeFood`) con `controlaStock=true` para alimentos, vacunas, medicinas, vitaminas, desinfectantes y materiales sanitarios.
- Existen productos configurados y visibles en Admin > Inventario (pestaña Productos).

## Endpoints involucrados
- Entradas: `POST/GET /api/inventario-entradas` (controller `InventarioEntradaProductoController`)
- Alertas: `GET /api/inventario-entradas/por-vencer`, `GET /api/inventario-entradas/vencidas`
- Consumo: `POST /api/plan-alimentacion/registrar-consumo` (usa FEFO por producto o por tipo)

## Casos de prueba

### 1) Crear entradas con vencimientos diferentes (vacuna)
1. Ir a Admin > Inventario > pestaña Entradas.
2. Seleccionar producto: "Vacuna Newcastle" (ejemplo).
3. Crear Entrada A: unidadControl=frasco; contenidoPorUnidadBase=100 (ml); cantidadUnidades=5; fechaVencimiento=fecha más próxima (p.ej., +10 días); códigoLote=N-001.
4. Crear Entrada B: unidadControl=frasco; contenidoPorUnidadBase=100 (ml); cantidadUnidades=5; fechaVencimiento=fecha más lejana (p.ej., +60 días); códigoLote=N-002.
5. Verificar tabla de entradas del producto muestra ambas con stock correcto.

Resultado esperado: Ambas entradas ACTIVAS; stock base y unidades coherentes.

### 2) Consumo FEFO por PRODUCTO
1. Desde la UI de consumo (planes/pollos) realizar `registrarConsumoAlimento` con `productId` del producto anterior y `cantidadKg` equivalente (ej. 150 ml -> 0.15 L si base ml). Si su UI solo acepta kg/ml base, enviar la cantidad en la unidad base configurada.
2. Validar en backend responde `success=true` y refleja consumo parcial o total de la entrada con vencimiento más próximo (Entrada A).
3. Volver a Admin > Inventario > Entradas, refrescar.

Resultado esperado: Disminuye primero Entrada A hasta agotarse; luego empieza Entrada B.

### 3) Bloqueo por vencido
1. Crear una nueva entrada con `fechaVencimiento` pasada (ayer) del mismo producto.
2. Intentar consumir.

Resultado esperado: Respuesta indica bloqueo por vencido (no descuenta). Entradas vencidas siguen visibles en Alertas > Vencidas.

### 4) Consumo parcial de contenedor
1. Con entrada de 1 frasco x 100 ml, consumir 50 ml.
2. Revisar tabla de entradas.

Resultado esperado: `stockBaseRestante=50`, `stockUnidadesRestantes=0.5` (si aplica), entrada sigue ACTIVA.

### 5) Alertas por vencer (global)
1. Crear entrada con `fechaVencimiento` en ≤15 días.
2. Ir a Admin > Inventario > pestaña Alertas.
3. Ajustar campo Días y presionar Actualizar.

Resultado esperado: La entrada aparece en "Por vencer". Las vencidas aparecen en "Vencidas".

### 6) No alimentarios con `controlaStock=true`
1. Marcar el TypeFood de "Desinfectante" con `controlaStock=true`.
2. Crear entradas y consumir.

Resultado esperado: Descuenta stock y aparece en trazabilidad por entrada.

### 7) Fallback a consumo consolidado (sin entradas)
1. Seleccionar un producto con `controlaStock=true` pero sin entradas.
2. Consumir por tipo (sin `productId`).

Resultado esperado: Si no hay entradas (y no hay bloqueo por vencimiento), el sistema cae al consolidado para no romper el flujo actual.

## Verificaciones técnicas
- Registro en `MovimientoInventarioProducto` con `loteId` y vínculo a entradas consumidas en `ConsumoEntradaProducto`.
- Métodos de servicio usados: `consumirPorProductoFefo`, `consumirPorTipoFefo` con bloqueo de vencidos.
- Endpoints de alertas retornan datos consistentes con las entradas creadas.

## Observaciones
- La UI sólo muestra datos y acciona endpoints; la lógica FEFO y validaciones están en backend.
- Para pruebas repetibles, borrar/limpiar datos según necesidad o crear productos de prueba dedicados.
