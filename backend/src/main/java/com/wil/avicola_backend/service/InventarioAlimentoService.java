package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.InventarioAlimento;
import com.wil.avicola_backend.model.MovimientoInventario;
import com.wil.avicola_backend.model.MovimientoInventario.TipoMovimiento;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.repository.InventarioAlimentoRepository;
import com.wil.avicola_backend.repository.MovimientoInventarioRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;

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
    private com.wil.avicola_backend.repository.ProductRepository productRepository;

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
    @Transactional
    public MovimientoInventario registrarConsumoLote(
            Long tipoAlimentoId, 
            BigDecimal cantidad, 
            String loteId, 
            String usuarioRegistro, 
            String observaciones) {
        
        System.out.println("🔄 Registrando consumo de alimento - Lote: " + loteId + ", Cantidad: " + cantidad + " kg");
        
        // 1. Validar entrada
        if (cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a cero");
        }
        
        // 2. Obtener o crear inventario
        InventarioAlimento inventario = obtenerOCrearInventario(tipoAlimentoId);
        
        // 3. Validar stock disponible
        if (!inventario.tieneSuficienteStock(cantidad)) {
            throw new RuntimeException(
                String.format("Stock insuficiente. Disponible: %.3f kg, Requerido: %.3f kg", 
                    inventario.getCantidadStock(), cantidad)
            );
        }
        
        // 4. Registrar movimiento ANTES de modificar el inventario
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
        movimiento = movimientoRepository.save(movimiento);
        
        // 6. Actualizar inventario
        inventario.descontarStock(cantidad);
        inventario = inventarioRepository.save(inventario);
        
        System.out.println("✅ Consumo registrado exitosamente:");
        System.out.println("   - Stock anterior: " + stockAnterior + " kg");
        System.out.println("   - Cantidad consumida: " + cantidad + " kg");
        System.out.println("   - Stock nuevo: " + inventario.getCantidadStock() + " kg");
        
        // 7. Verificar alertas de stock bajo
        verificarAlertaStockBajo(inventario);
        
        return movimiento;
    }
    
    /**
     * Obtener o crear inventario para un tipo de alimento
     */
    private InventarioAlimento obtenerOCrearInventario(Long tipoAlimentoId) {
        Optional<InventarioAlimento> inventarioOpt = inventarioRepository.findByTipoAlimentoId(tipoAlimentoId);
        
        if (inventarioOpt.isPresent()) {
            return inventarioOpt.get();
        }
        
        // Crear inventario automáticamente con stock inicial
        Optional<TypeFood> tipoAlimentoOpt = typeFoodRepository.findById(tipoAlimentoId);
        if (!tipoAlimentoOpt.isPresent()) {
            throw new RuntimeException("Tipo de alimento no encontrado con ID: " + tipoAlimentoId);
        }
        
        TypeFood tipoAlimento = tipoAlimentoOpt.get();
        
        InventarioAlimento nuevoInventario = InventarioAlimento.builder()
                .tipoAlimento(tipoAlimento)
                .cantidadStock(new BigDecimal("1000.0")) // Stock inicial por defecto
                .stockMinimo(new BigDecimal("50.0")) // Stock mínimo por defecto
                .unidadMedida("KG")
                .observaciones("Inventario creado automáticamente")
                .build();
        
        nuevoInventario = inventarioRepository.save(nuevoInventario);
        
        // Registrar movimiento de entrada inicial
        MovimientoInventario movimientoInicial = MovimientoInventario.builder()
                .inventario(nuevoInventario)
                .tipoMovimiento(TipoMovimiento.ENTRADA)
                .cantidad(new BigDecimal("1000.0"))
                .stockAnterior(BigDecimal.ZERO)
                .stockNuevo(new BigDecimal("1000.0"))
                .observaciones("Stock inicial automático")
                .usuarioRegistro("SISTEMA")
                .build();
        
        movimientoRepository.save(movimientoInicial);
        
        System.out.println("✅ Inventario creado automáticamente para: " + tipoAlimento.getName() + " con 1000 kg");
        
        return nuevoInventario;
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
     * Obtener todos los inventarios disponibles con datos calculados
     */
    public List<com.wil.avicola_backend.dto.InventarioResponseDto> obtenerTodosLosInventariosConCalculos() {
        var inventarios = inventarioRepository.findAll();
        
        return inventarios.stream()
            .map(this::convertirAInventarioResponseDto)
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Convertir InventarioAlimento a DTO con cálculos
     * MEJORADO: Extraer el nombre real del producto desde las observaciones
     */
    private com.wil.avicola_backend.dto.InventarioResponseDto convertirAInventarioResponseDto(InventarioAlimento inventario) {
        // Calcular total consumido
        BigDecimal totalConsumido = calcularTotalConsumido(inventario.getTipoAlimento().getId());
        
        // Calcular cantidad original (stock actual + consumido)
        BigDecimal cantidadOriginal = inventario.getCantidadStock().add(totalConsumido);
        
        // Extraer nombre real del producto desde las observaciones
        String nombreProducto = extraerNombreProductoDeObservaciones(inventario.getObservaciones(), inventario.getTipoAlimento().getName());
        
        return com.wil.avicola_backend.dto.InventarioResponseDto.builder()
            .id(inventario.getId())
            .tipoAlimento(com.wil.avicola_backend.dto.InventarioResponseDto.TipoAlimentoDto.builder()
                .id(inventario.getTipoAlimento().getId())
                .name(nombreProducto) // Usar nombre real del producto
                .categoria(inventario.getTipoAlimento().getCategoria())
                .build())
            .cantidadStock(inventario.getCantidadStock())
            .cantidadOriginal(cantidadOriginal)
            .totalConsumido(totalConsumido)
            .unidadMedida(inventario.getUnidadMedida())
            .stockMinimo(inventario.getStockMinimo())
            .observaciones(inventario.getObservaciones())
            .fechaCreacion(inventario.getFechaCreacion())
            .fechaActualizacion(inventario.getFechaActualizacion())
            .build();
    }
    
    /**
     * Extraer el nombre real del producto desde las observaciones
     */
    private String extraerNombreProductoDeObservaciones(String observaciones, String nombrePorDefecto) {
        if (observaciones != null && observaciones.contains("Producto ID:")) {
            try {
                // Buscar el patrón "Producto ID: X | NombreProducto |"
                String[] partes = observaciones.split("\\|");
                if (partes.length >= 2) {
                    return partes[1].trim(); // El nombre está en la segunda parte
                }
            } catch (Exception e) {
                System.err.println("⚠️ Error extrayendo nombre del producto: " + e.getMessage());
            }
        }
        return nombrePorDefecto; // Fallback al nombre del tipo
    }

    /**
     * Obtener todos los inventarios disponibles (método original - DEPRECADO)
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
     * Calcular el total consumido por tipo de alimento
     */
    public BigDecimal calcularTotalConsumido(Long tipoAlimentoId) {
        try {
            // Obtener inventario del tipo de alimento
            var inventario = inventarioRepository.findByTipoAlimentoId(tipoAlimentoId);
            if (inventario.isEmpty()) {
                return BigDecimal.ZERO;
            }
            
            // Calcular la suma de todos los movimientos de consumo para este inventario
            return movimientoRepository
                .findByInventarioAndTipoMovimiento(inventario.get(), TipoMovimiento.CONSUMO_LOTE)
                .stream()
                .map(MovimientoInventario::getCantidad)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        } catch (Exception e) {
            System.err.println("❌ Error calculando total consumido para tipo: " + tipoAlimentoId + " - " + e.getMessage());
            return BigDecimal.ZERO;
        }
    }
    
    /**
     * Sincronizar productos reales con inventario automático
     * NUEVA LÓGICA: Crear un inventario individual para cada producto registrado
     */
    @Transactional
    public int sincronizarInventarioConProductos() {
        System.out.println("🔄 Sincronizando inventario con productos reales (TODOS los productos individuales)...");
        
        try {
            // Obtener todos los productos registrados
            var productos = (java.util.List<com.wil.avicola_backend.model.Product>) productRepository.findAll();
            
            if (productos.isEmpty()) {
                System.out.println("⚠️ No hay productos registrados, no se puede sincronizar inventario");
                return 0;
            }
            
            int sincronizados = 0;
            
            // NUEVA ESTRATEGIA: Crear un inventario individual para CADA producto
            // SIN eliminar los existentes, sino agregando nuevos
            for (var producto : productos) {
                // Solo procesar productos que tienen TypeFood asociado
                if (producto.getTypeFood() == null) {
                    System.out.println("   ⚠️ Producto sin tipo de alimento: " + producto.getName());
                    continue;
                }
                
                // Verificar si ya existe un inventario con este producto específico
                var inventarioExistente = inventarioRepository.findAll().stream()
                    .filter(inv -> inv.getObservaciones() != null && 
                           inv.getObservaciones().contains("Producto ID: " + producto.getId()))
                    .findFirst();
                
                if (inventarioExistente.isPresent()) {
                    // Actualizar inventario existente
                    var inventario = inventarioExistente.get();
                    inventario.setCantidadStock(new java.math.BigDecimal(producto.getQuantity()));
                    inventario.setObservaciones("Producto ID: " + producto.getId() + " | " + producto.getName() + 
                                               " | Precio: $" + producto.getPrice_unit() + 
                                               " | Proveedor: " + (producto.getProvider() != null ? producto.getProvider().getName() : "N/A"));
                    inventarioRepository.save(inventario);
                    sincronizados++;
                    
                    System.out.println("   🔄 Inventario actualizado para: " + producto.getName() + 
                                     " (ID: " + producto.getId() + ", Stock: " + producto.getQuantity() + " kg)");
                } else {
                    // Crear un nuevo inventario para este producto específico
                    var nuevoInventario = InventarioAlimento.builder()
                        .tipoAlimento(producto.getTypeFood())
                        .cantidadStock(new java.math.BigDecimal(producto.getQuantity()))
                        .stockMinimo(new java.math.BigDecimal(Math.max(10, producto.getQuantity() * 0.1))) // 10% como mínimo
                        .unidadMedida("kg")
                        .observaciones("Producto ID: " + producto.getId() + " | " + producto.getName() + 
                                     " | Precio: $" + producto.getPrice_unit() + 
                                     " | Proveedor: " + (producto.getProvider() != null ? producto.getProvider().getName() : "N/A"))
                        .build();
                    
                    inventarioRepository.save(nuevoInventario);
                    sincronizados++;
                    
                    System.out.println("   ✅ Inventario creado para: " + producto.getName() + 
                                     " (ID: " + producto.getId() + ", Stock: " + producto.getQuantity() + " kg)");
                }
            }
            
            System.out.println("✅ Sincronización completada: " + sincronizados + " inventarios procesados");
            System.out.println("📊 Ahora se muestran TODOS los productos registrados por separado");
            return sincronizados;
            
        } catch (Exception e) {
            System.err.println("❌ Error sincronizando inventario con productos: " + e.getMessage());
            throw new RuntimeException("Error sincronizando inventario: " + e.getMessage());
        }
    }
    
    /**
     * Limpiar inventarios genéricos obsoletos
     * Elimina inventarios que no tienen productos específicos asociados
     */
    @Transactional
    public int limpiarInventariosGenericos() {
        System.out.println("🧹 Limpiando inventarios genéricos obsoletos...");
        
        try {
            var todosInventarios = inventarioRepository.findAll();
            int eliminados = 0;
            
            for (var inventario : todosInventarios) {
                String observaciones = inventario.getObservaciones();
                
                // Identificar inventarios genéricos (sin Producto ID específico)
                boolean esGenerico = observaciones == null || 
                                   !observaciones.contains("Producto ID:") ||
                                   observaciones.contains("Stock inicial de ejemplo") ||
                                   observaciones.contains("Inventario creado automáticamente") ||
                                   observaciones.contains("Sincronizado con producto:"); // Este formato es obsoleto
                
                if (esGenerico) {
                    System.out.println("   🗑️ Eliminando inventario genérico: " + 
                                     inventario.getTipoAlimento().getName() + 
                                     " (ID: " + inventario.getId() + ")");
                    
                    // Eliminar todos los movimientos asociados primero
                    try {
                        var movimientos = movimientoRepository.findAllByOrderByFechaMovimientoDesc()
                            .stream()
                            .filter(mov -> mov.getInventario().getId().equals(inventario.getId()))
                            .collect(java.util.stream.Collectors.toList());
                        
                        if (!movimientos.isEmpty()) {
                            System.out.println("   ⚠️ Eliminando " + movimientos.size() + " movimientos asociados");
                            movimientoRepository.deleteAll(movimientos);
                        }
                    } catch (Exception e) {
                        System.err.println("   ⚠️ Error eliminando movimientos: " + e.getMessage());
                    }
                    
                    // Ahora eliminar el inventario
                    inventarioRepository.delete(inventario);
                    eliminados++;
                }
            }
            
            System.out.println("✅ Limpieza completada: " + eliminados + " inventarios genéricos eliminados");
            return eliminados;
            
        } catch (Exception e) {
            System.err.println("❌ Error limpiando inventarios genéricos: " + e.getMessage());
            throw new RuntimeException("Error en limpieza: " + e.getMessage());
        }
    }
    
    /**
     * Obtener todos los movimientos de inventario
     */
    public List<MovimientoInventario> obtenerTodosLosMovimientos() {
        return movimientoRepository.findAllByOrderByFechaMovimientoDesc();
    }
}
