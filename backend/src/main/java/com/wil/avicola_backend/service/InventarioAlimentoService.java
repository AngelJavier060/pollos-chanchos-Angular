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
}
