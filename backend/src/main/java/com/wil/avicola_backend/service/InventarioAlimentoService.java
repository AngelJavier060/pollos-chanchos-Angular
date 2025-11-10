package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.wil.avicola_backend.model.InventarioAlimento;
import com.wil.avicola_backend.model.MovimientoInventario;
import com.wil.avicola_backend.model.MovimientoInventario.TipoMovimiento;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.dto.InventarioAlimentoResponse;
import com.wil.avicola_backend.repository.InventarioAlimentoRepository;
import com.wil.avicola_backend.repository.MovimientoInventarioRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.InventarioProducto;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;

/**
 * Servicio profesional para gestión de inventario de alimentos
 */
@Service
@Transactional
public class InventarioAlimentoService {

    @Autowired
    private InventarioAlimentoRepository inventarioRepository;
    
    @Autowired
    private MovimientoInventarioRepository movimientoRepository;
    
    @Autowired
    private TypeFoodRepository typeFoodRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventarioProductoService inventarioProductoService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Registrar consumo de alimento por lote con deducción automática
     * 
     * @param tipoAlimentoId ID del tipo de alimento
     * @param cantidad Cantidad a consumir
     * @param loteId ID del lote que consume
     * @param usuarioRegistro Usuario que registra
     * @param observaciones Observaciones adicionales
     * @return MovimientoInventario creado
     * @throws RuntimeException si no hay suficiente stock
     */
    /**
     * ✅ MÉTODO MEJORADO CON LOGS DETALLADOS PARA DEBUGGING
     */
    @Transactional
    public MovimientoInventario registrarConsumoLote(
            Long tipoAlimentoId, 
            BigDecimal cantidad, 
            String loteId, 
            String usuarioRegistro, 
            String observaciones) {
        
        System.out.println("🔄 [INICIO] Registrando consumo de alimento:");
        System.out.println("   - tipoAlimentoId: " + tipoAlimentoId);
        System.out.println("   - cantidad: " + cantidad + " kg");
        System.out.println("   - loteId: " + loteId);
        System.out.println("   - usuario: " + usuarioRegistro);
        
        try {
            // 1. Validar entrada
            if (cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La cantidad debe ser mayor a cero");
            }
            System.out.println("   ✓ Validación de cantidad OK");

            // 2. Obtener o crear inventario
            System.out.println("   🔍 Obteniendo inventario...");
            InventarioAlimento inventario = obtenerOCrearInventario(tipoAlimentoId);
            System.out.println("   ✓ Inventario obtenido ID: " + inventario.getId());
            
            // 2.1 Sanitizar datos críticos - CON MANEJO DE ERRORES MEJORADO
            System.out.println("   🧹 Sanitizando inventario...");
            try {
                inventario = sanitizarInventario(inventario, tipoAlimentoId);
                System.out.println("   ✓ Sanitización completada");
            } catch (Exception sanitizarEx) {
                System.err.println("   ⚠️ Error en sanitización (continuando): " + sanitizarEx.getMessage());
                // Continuar con el inventario sin sanitizar si hay problemas
            }
            
            // 3. Validar stock disponible
            System.out.println("   📊 Validando stock disponible...");
            System.out.println("       Stock actual: " + inventario.getCantidadStock() + " kg");
            System.out.println("       Stock requerido: " + cantidad + " kg");
            
            if (!inventario.tieneSuficienteStock(cantidad)) {
                String errorMsg = String.format("Stock insuficiente. Disponible: %.3f kg, Requerido: %.3f kg", 
                    inventario.getCantidadStock(), cantidad);
                System.err.println("   ❌ " + errorMsg);
                throw new RuntimeException(errorMsg);
            }
            System.out.println("   ✓ Stock suficiente");
            
            // 4. Registrar movimiento ANTES de modificar el inventario
            System.out.println("   📝 Creando movimiento...");
            BigDecimal stockAnterior = inventario.getCantidadStock();
            BigDecimal stockNuevo = stockAnterior.subtract(cantidad);
            
            MovimientoInventario movimiento = MovimientoInventario.builder()
                    .inventario(inventario)
                    .tipoMovimiento(TipoMovimiento.CONSUMO_LOTE)
                    .cantidad(cantidad)
                    .stockAnterior(stockAnterior)
                    .stockNuevo(stockNuevo)
                    .loteId(loteId)
                    .observaciones(observaciones)
                    .usuarioRegistro(usuarioRegistro)
                    .build();
            
            // 5. Guardar movimiento primero
            System.out.println("   💾 Guardando movimiento...");
            movimiento = movimientoRepository.save(movimiento);
            System.out.println("   ✓ Movimiento guardado ID: " + movimiento.getId());
            
            // 6. Actualizar inventario - CON MANEJO DE ERRORES
            System.out.println("   📦 Actualizando inventario...");
            try {
                inventario.descontarStock(cantidad);
                inventario = inventarioRepository.save(inventario);
                System.out.println("   ✓ Inventario actualizado");
            } catch (Exception invEx) {
                System.err.println("   ❌ Error actualizando inventario: " + invEx.getMessage());
                throw new RuntimeException("Error actualizando inventario", invEx);
            }
            
            System.out.println("✅ [ÉXITO] Consumo registrado exitosamente:");
            System.out.println("   - Stock anterior: " + stockAnterior + " kg");
            System.out.println("   - Stock nuevo: " + stockNuevo + " kg");
            System.out.println("   - Movimiento ID: " + movimiento.getId());
            
            // 7. Verificar alerta de stock bajo
            verificarAlertaStockBajo(inventario);
            
            // Add WebSocket notification for inventory changes
            if (movimiento != null) {
                messagingTemplate.convertAndSend("/topic/inventory-update", "Inventory changed for type: " + inventario.getTipoAlimento().getName());
            }
            
            return movimiento;
            
        } catch (Exception ex) {
            System.err.println("❌ [ERROR GENERAL] Error en registrarConsumoLote:");
            System.err.println("   Mensaje: " + ex.getMessage());
            System.err.println("   Tipo: " + ex.getClass().getSimpleName());
            ex.printStackTrace();
            throw ex; // Re-lanzar para que llegue al controlador
        }
    }

    /**
     * Fallback público: descuenta SOLO en inventario por PRODUCTO sin tocar inventario por tipo.
     * Útil cuando inventario_alimentos no tiene stock suficiente pero sí existe stock por producto.
     */
    @Transactional
    public void registrarConsumoSoloEnInventarioProducto(Long tipoAlimentoId, Long productId, BigDecimal cantidad,
                                                         String loteId, String usuarioRegistro, String observaciones) {
        sincronizarConsumoEnInventarioProducto(tipoAlimentoId, productId, cantidad, loteId, usuarioRegistro, observaciones);
    }
    
    /**
     * ✅ MÉTODO MEJORADO - Obtener o crear inventario de forma segura
     */
    private InventarioAlimento obtenerOCrearInventario(Long tipoAlimentoId) {
        System.out.println("🔍 Obteniendo/creando inventario para tipoAlimentoId: " + tipoAlimentoId);
        
        try {
            Optional<InventarioAlimento> inventarioOpt = inventarioRepository.findByTipoAlimentoId(tipoAlimentoId);
            
            if (inventarioOpt.isPresent()) {
                System.out.println("   ✓ Inventario existente encontrado");
                InventarioAlimento existente = inventarioOpt.get();
                return sanitizarInventario(existente, tipoAlimentoId);
            }
            
            // Crear inventario nuevo solo si es absolutamente necesario
            System.out.println("   ⚠️ No existe inventario, creando uno nuevo...");
            
            Optional<TypeFood> tipoAlimentoOpt = typeFoodRepository.findById(tipoAlimentoId);
            if (!tipoAlimentoOpt.isPresent()) {
                throw new RuntimeException("Tipo de alimento no encontrado con ID: " + tipoAlimentoId);
            }
            
            TypeFood tipoAlimento = tipoAlimentoOpt.get();
            System.out.println("   📝 Creando inventario para: " + tipoAlimento.getName());
            
            try {
                InventarioAlimento nuevoInventario = InventarioAlimento.builder()
                        .tipoAlimento(tipoAlimento)
                        .cantidadStock(BigDecimal.ZERO)
                        .stockMinimo(BigDecimal.ZERO)
                        .unidadMedida("KG")
                        .observaciones("Inventario creado automáticamente - Stock inicial 0 kg")
                        .build();
                
                nuevoInventario = inventarioRepository.save(nuevoInventario);
                System.out.println("   ✅ Inventario creado exitosamente ID: " + nuevoInventario.getId());
                
                return nuevoInventario;
                
            } catch (Exception ex) {
                System.err.println("   ❌ Error creando inventario: " + ex.getMessage());
                throw new RuntimeException("No se pudo crear el inventario para tipo de alimento: " + tipoAlimento.getName(), ex);
            }
            
        } catch (Exception ex) {
            System.err.println("❌ Error general obteniendo/creando inventario: " + ex.getMessage());
            throw new RuntimeException("Error accediendo al inventario para tipoAlimentoId: " + tipoAlimentoId, ex);
        }
    }

    /**
     * Asegura que el inventario tenga valores válidos para columnas críticas.
     * Evita errores de DB del tipo "could not execute statement ... unidad_medida=?" o
     * "tipo_alimento_id cannot be null" cuando hay datos antiguos con nulls.
     */
    /**
     * ✅ MÉTODO ARREGLADO - Sanitizar inventario sin causar errores SQL
     */
    private InventarioAlimento sanitizarInventario(InventarioAlimento inventario, Long tipoAlimentoId) {
        System.out.println("🔧 Sanitizando inventario ID: " + inventario.getId());
        
        boolean cambiado = false;
        
        // Validación más robusta para evitar errores SQL
        try {
            if (inventario.getUnidadMedida() == null || inventario.getUnidadMedida().trim().isEmpty()) {
                inventario.setUnidadMedida("KG");
                cambiado = true;
                System.out.println("   ✓ UnidadMedida establecida a 'KG'");
            }
            
            if (inventario.getStockMinimo() == null) {
                inventario.setStockMinimo(BigDecimal.ZERO);
                cambiado = true;
                System.out.println("   ✓ StockMinimo establecido a 0");
            }
            
            if (inventario.getCantidadStock() == null) {
                inventario.setCantidadStock(BigDecimal.ZERO);
                cambiado = true;
                System.out.println("   ✓ CantidadStock establecida a 0");
            }
            
            // Solo actualizar tipoAlimento si realmente es necesario
            if (inventario.getTipoAlimento() == null && tipoAlimentoId != null) {
                Optional<TypeFood> tf = typeFoodRepository.findById(tipoAlimentoId);
                if (tf.isPresent()) {
                    inventario.setTipoAlimento(tf.get());
                    cambiado = true;
                    System.out.println("   ✓ TipoAlimento establecido: " + tf.get().getName());
                } else {
                    System.err.println("   ⚠️ TipoAlimento no encontrado con ID: " + tipoAlimentoId);
                }
            }
            
            // ✅ ARREGLO PRINCIPAL: Persistir con validación de restricciones
            if (cambiado) {
                try {
                    // Validar antes de guardar
                    if (inventario.getTipoAlimento() == null) {
                        System.err.println("❌ No se puede guardar inventario sin TipoAlimento");
                        return inventario; // Retornar sin guardar
                    }
                    
                    System.out.println("💾 Guardando cambios sanitizados...");
                    inventario = inventarioRepository.save(inventario);
                    System.out.println("✅ Inventario sanitizado y guardado exitosamente");
                    
                } catch (Exception ex) {
                    System.err.println("❌ ERROR SQL en sanitización: " + ex.getMessage());
                    System.err.println("   Detalles: " + ex.toString());
                    
                    // ✅ NO LANZAR EXCEPCIÓN - Solo registrar el error y continuar
                    System.out.println("🔄 Continuando con inventario sin persistir cambios sanitizados");
                }
            } else {
                System.out.println("ℹ️ No se requieren cambios de sanitización");
            }
            
        } catch (Exception ex) {
            System.err.println("❌ Error general en sanitización: " + ex.getMessage());
            // No interrumpir el flujo principal
        }
        
        return inventario;
    }
    
    /**
     * Verificar y registrar alertas de stock bajo
     */
    private void verificarAlertaStockBajo(InventarioAlimento inventario) {
        if (inventario.estaEnStockMinimo()) {
            System.out.println("⚠️ ALERTA: Stock bajo para " + inventario.getTipoAlimento().getName() + 
                             " - Disponible: " + inventario.getCantidadStock() + " kg, Mínimo: " + inventario.getStockMinimo() + " kg");
            // Aquí se podría implementar notificaciones por email, etc.
        }
    }
    
    /**
     * Obtener inventario disponible para un tipo de alimento
     */
    public Optional<InventarioAlimento> obtenerInventarioPorTipo(Long tipoAlimentoId) {
        return inventarioRepository.findByTipoAlimentoId(tipoAlimentoId);
    }
    
    /**
     * Obtener todos los inventarios
     */
    public List<InventarioAlimento> obtenerTodosInventarios() {
        return inventarioRepository.findAll();
    }
    
    /**
     * Obtener inventarios con stock bajo
     */
    public List<InventarioAlimento> obtenerInventariosConStockBajo() {
        return inventarioRepository.findInventariosConStockBajo();
    }
    
    /**
     * Obtener historial de movimientos por lote
     */
    public List<MovimientoInventario> obtenerMovimientosPorLote(String loteId) {
        return movimientoRepository.findByLoteIdOrderByFechaMovimientoDesc(loteId);
    }
    
    /**
     * Obtener total consumido por lote y tipo de alimento
     */
    public Double obtenerTotalConsumidoPorLote(String loteId, Long tipoAlimentoId) {
        Double total = movimientoRepository.sumConsumoByLoteAndTipoAlimento(loteId, tipoAlimentoId);
        return total != null ? total : 0.0;
    }
    
    /**
     * Agregar stock manualmente
     */
    @Transactional
    public MovimientoInventario agregarStock(Long tipoAlimentoId, BigDecimal cantidad, String usuarioRegistro, String observaciones) {
        InventarioAlimento inventario = obtenerOCrearInventario(tipoAlimentoId);
        
        BigDecimal stockAnterior = inventario.getCantidadStock();
        inventario.agregarStock(cantidad);
        inventario = inventarioRepository.save(inventario);
        
        MovimientoInventario movimiento = MovimientoInventario.builder()
                .inventario(inventario)
                .tipoMovimiento(TipoMovimiento.ENTRADA)
                .cantidad(cantidad)
                .stockAnterior(stockAnterior)
                .stockNuevo(inventario.getCantidadStock())
                .observaciones(observaciones)
                .usuarioRegistro(usuarioRegistro)
                .build();
        
        return movimientoRepository.save(movimiento);
    }
    
    /**
     * Obtener todos los inventarios disponibles
     */
    public List<InventarioAlimento> obtenerTodosLosInventarios() {
        return inventarioRepository.findAll();
    }
    
    /**
     * Obtener inventarios con stock bajo (alertas)
     */
    public List<InventarioAlimento> obtenerInventariosStockBajo() {
        return inventarioRepository.findInventariosConStockBajo();
    }
    
    /**
     * Obtener stock por lista de IDs de productos/tipos de alimento
     */
    public java.util.Map<Long, BigDecimal> getStockPorProductos(List<Long> productIds) {
        java.util.Map<Long, BigDecimal> stockMap = new java.util.HashMap<>();
        
        for (Long productId : productIds) {
            Optional<InventarioAlimento> inventarioOpt = inventarioRepository.findByTipoAlimentoId(productId);
            if (inventarioOpt.isPresent()) {
                stockMap.put(productId, inventarioOpt.get().getCantidadStock());
            } else {
                stockMap.put(productId, BigDecimal.ZERO);
            }
        }
        
        return stockMap;
    }

    //aux creado por william
    public ResponseEntity<?> findInventarios() {
        return ResponseEntity.ok().body(inventarioRepository.findAll());
    }
    
    /**
     * Crear datos de ejemplo para inventario (TEMPORAL - SOLO DEMO)
     */
    @Transactional
    public int crearDatosEjemploInventario() {
        System.out.println("🎯 Creando inventarios de ejemplo...");
        
        try {
            // Obtener algunos tipos de alimento existentes
            var tiposAlimento = (java.util.List<com.wil.avicola_backend.model.TypeFood>) typeFoodRepository.findAll();
            
            if (tiposAlimento.isEmpty()) {
                System.out.println("⚠️ No hay tipos de alimento disponibles, no se pueden crear inventarios");
                return 0;
            }
            
            int creados = 0;
            
            // Crear inventarios para los primeros 3 tipos de alimento
            for (int i = 0; i < Math.min(3, tiposAlimento.size()); i++) {
                var tipo = tiposAlimento.get(i);
                
                // Verificar si ya existe inventario para este tipo
                var existente = inventarioRepository.findByTipoAlimento(tipo);
                if (existente.isPresent()) {
                    System.out.println("   - Inventario ya existe para: " + tipo.getName());
                    continue;
                }
                
                // Crear inventario con valores de ejemplo
                var inventario = InventarioAlimento.builder()
                    .tipoAlimento(tipo)
                    .cantidadStock(new java.math.BigDecimal(500 - (i * 200))) // 500, 300, 100
                    .stockMinimo(new java.math.BigDecimal(50 - (i * 15))) // 50, 35, 20
                    .unidadMedida("kg")
                    .observaciones("Stock inicial de ejemplo para " + tipo.getName())
                    .build();
                
                inventarioRepository.save(inventario);
                creados++;
                
                System.out.println("   ✅ Inventario creado para: " + tipo.getName() + 
                                 " (Stock: " + inventario.getCantidadStock() + " kg)");
            }
            
            System.out.println("✅ Se crearon " + creados + " inventarios de ejemplo");
            return creados;
            
        } catch (Exception e) {
            System.err.println("❌ Error creando inventarios de ejemplo: " + e.getMessage());
            throw new RuntimeException("Error creando inventarios de ejemplo: " + e.getMessage());
        }
    }

    /**
     * Construir lista de inventarios con campo cantidadOriginal calculado.
     * cantidadOriginal se determina como:
     *  - Si existen movimientos: tomar el movimiento más antiguo del inventario y
     *    usar el mayor entre stockAnterior y stockNuevo (cubre ENTRADA inicial o primer CONSUMO).
     *  - Si no hay movimientos: usar la cantidadStock actual como original.
     */
    public List<InventarioAlimentoResponse> obtenerTodosLosInventariosDTO() {
        List<InventarioAlimento> inventarios = inventarioRepository.findAll();
        List<InventarioAlimentoResponse> respuesta = new ArrayList<>();

        for (InventarioAlimento inv : inventarios) {
            BigDecimal original = calcularCantidadOriginal(inv);

            InventarioAlimentoResponse dto = InventarioAlimentoResponse.builder()
                .id(inv.getId())
                .tipoAlimento(inv.getTipoAlimento())
                .cantidadStock(inv.getCantidadStock())
                .cantidadOriginal(original)
                .unidadMedida(inv.getUnidadMedida())
                .stockMinimo(inv.getStockMinimo())
                .observaciones(inv.getObservaciones())
                .fechaCreacion(inv.getFechaCreacion())
                .fechaActualizacion(inv.getFechaActualizacion())
                .build();

            respuesta.add(dto);
        }

        return respuesta;
    }

    private BigDecimal calcularCantidadOriginal(InventarioAlimento inventario) {
        List<MovimientoInventario> movimientosDesc = movimientoRepository
            .findByInventarioIdOrderByFechaMovimientoDesc(inventario.getId());

        if (movimientosDesc == null || movimientosDesc.isEmpty()) {
            // Sin movimientos registrados: asumimos que el stock actual es el original
            return inventario.getCantidadStock();
        }

        // El más antiguo es el último de la lista ordenada DESC
        MovimientoInventario primero = movimientosDesc.get(movimientosDesc.size() - 1);
        BigDecimal a = primero.getStockAnterior() != null ? primero.getStockAnterior() : BigDecimal.ZERO;
        BigDecimal b = primero.getStockNuevo() != null ? primero.getStockNuevo() : BigDecimal.ZERO;
        return a.max(b);
    }

    /**
     * Descuenta también del inventario por PRODUCTO (tabla inventario_producto) 
     * para reflejar la disminución en la pestaña Productos.
     * Regla: FIFO por fecha de compra (producto más antiguo primero). Si no existe
     * inventario del producto, se inicializa con la cantidad del producto (quantity).
     */
    private void sincronizarConsumoEnInventarioProducto(Long tipoAlimentoId, Long productId, BigDecimal cantidad, String loteId, String usuarioRegistro, String observaciones) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) return;

        // Si se especifica un productId, descontar de ese producto primero
        List<Product> productos = new ArrayList<>();
        if (productId != null) {
            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isPresent()) {
                productos.add(prodOpt.get());
            } else {
                System.out.println("ℹ️ productId " + productId + " no encontrado; se usará FIFO por tipo de alimento");
            }
        }

        // Si no hay producto específico o no se encontró, usar todos los productos del tipo (FIFO)
        if (productos.isEmpty()) {
            if (tipoAlimentoId != null) {
                productos = productRepository.findByTypeFood_Id(tipoAlimentoId);
            }
        } else {
            // Agregar como fallback otros productos del mismo tipo (excluyendo el específico) para completar si no alcanza
            if (tipoAlimentoId != null) {
                List<Product> mismosTipo = productRepository.findByTypeFood_Id(tipoAlimentoId);
                for (Product p : mismosTipo) {
                    // Evitar comparar con equals sobre primitivo long
                    if (productId == null || p.getId() != productId.longValue()) {
                        productos.add(p);
                    }
                }
            }
        }

        if (productos == null || productos.isEmpty()) {
            System.out.println("ℹ️ No hay productos asociados a este tipo de alimento para sincronizar");
            return;
        }

        // Orden FIFO por fecha de compra (nulls al final)
        productos.sort((p1, p2) -> {
            java.util.Date d1 = p1.getDate_compra();
            java.util.Date d2 = p2.getDate_compra();
            if (d1 == null && d2 == null) return 0;
            if (d1 == null) return 1;
            if (d2 == null) return -1;
            return d1.compareTo(d2);
        });

        BigDecimal restante = cantidad;
        for (Product p : productos) {
            if (restante.compareTo(BigDecimal.ZERO) <= 0) break;

            // Asegurar inventario del producto. Si no existe y el producto tiene quantity > 0, lo inicializamos vía ENTRADA
            InventarioProducto invProd = inventarioProductoService.porProducto(p.getId());
            if (invProd == null) {
                // Crear con 0 y luego ajustar con entrada inicial = product.quantity si > 0
                inventarioProductoService.crearSiNoExiste(p.getId(), null);
                if (p.getQuantity() > 0) {
                    inventarioProductoService.registrarMovimiento(
                        p.getId(),
                        MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                        new BigDecimal(p.getQuantity()),
                        null,
                        null,
                        usuarioRegistro != null ? usuarioRegistro : "SISTEMA",
                        "Inicialización automática desde Product.quantity"
                    );
                }
                invProd = inventarioProductoService.porProducto(p.getId());
            }

            if (invProd == null || invProd.getCantidadStock() == null) continue;
            BigDecimal disponible = invProd.getCantidadStock();
            if (disponible.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal aConsumir = restante.min(disponible);
            if (aConsumir.compareTo(BigDecimal.ZERO) <= 0) continue;

            inventarioProductoService.registrarMovimiento(
                p.getId(),
                MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE,
                aConsumir,
                null,
                loteId,
                usuarioRegistro != null ? usuarioRegistro : "SISTEMA",
                observaciones != null ? observaciones : "Sincronización con consumo por tipo de alimento"
            );

            restante = restante.subtract(aConsumir);
        }

        if (restante.compareTo(BigDecimal.ZERO) > 0) {
            System.out.println("⚠️ Quedó consumo pendiente sin descontar en inventario por producto: " + restante + " kg");
        }
    }

    /**
     * Registrar consumo por LOTE priorizando un producto específico (productId)
     * para sincronización con inventario de producto. Si no alcanza el stock
     * de ese producto, continuará con otros del mismo tipo por FIFO.
     */
    @Transactional
    public MovimientoInventario registrarConsumoLotePorProducto(
            Long tipoAlimentoId,
            Long productId,
            BigDecimal cantidad,
            String loteId,
            String usuarioRegistro,
            String observaciones) {

        System.out.println("🔄 Registrando consumo POR PRODUCTO - Lote: " + loteId + ", Producto: " + productId + ", Cantidad: " + cantidad + " kg");

        if (cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a cero");
        }

        InventarioAlimento inventario = obtenerOCrearInventario(tipoAlimentoId);
        // Sanitizar datos críticos
        inventario = sanitizarInventario(inventario, tipoAlimentoId);

        if (!inventario.tieneSuficienteStock(cantidad)) {
            throw new RuntimeException(
                String.format("Stock insuficiente. Disponible: %.3f kg, Requerido: %.3f kg",
                    inventario.getCantidadStock(), cantidad)
            );
        }

        BigDecimal stockAnterior = inventario.getCantidadStock();
        BigDecimal stockNuevo = stockAnterior.subtract(cantidad);

        MovimientoInventario movimiento = MovimientoInventario.builder()
                .inventario(inventario)
                .tipoMovimiento(TipoMovimiento.CONSUMO_LOTE)
                .cantidad(cantidad)
                .stockAnterior(stockAnterior)
                .stockNuevo(stockNuevo)
                .loteId(loteId)
                .observaciones(observaciones)
                .usuarioRegistro(usuarioRegistro)
                .build();

        movimiento = movimientoRepository.save(movimiento);

        inventario.descontarStock(cantidad);
        inventario = inventarioRepository.save(inventario);

        verificarAlertaStockBajo(inventario);

        try {
            sincronizarConsumoEnInventarioProducto(tipoAlimentoId, productId, cantidad, loteId, usuarioRegistro, observaciones);
        } catch (Exception ex) {
            System.err.println("⚠️ No se pudo sincronizar consumo en inventario de producto (target): " + ex.getMessage());
        }

        return movimiento;
    }
}
