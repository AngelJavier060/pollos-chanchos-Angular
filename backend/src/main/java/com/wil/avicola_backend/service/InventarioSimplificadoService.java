package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.error.RequestException;

/**
 * ✅ SERVICIO SIMPLIFICADO DE INVENTARIO
 * Solo usa movimientos_inventario_producto - sin sistemas obsoletos
 */
@Service
@Transactional
public class InventarioSimplificadoService {

    @Autowired
    private InventarioProductoService inventarioProductoService;
    
    @Autowired
    private ProductRepository productRepository;

    /**
     * ✅ MÉTODO PRINCIPAL: Registrar consumo usando solo movimientos_inventario_producto
     * Elimina la confusión de múltiples sistemas de inventario
     */
    @Transactional
    public ResponseEntity<?> registrarConsumoAlimento(Long productId, BigDecimal cantidadKg, 
                                                     String loteId, String usuarioRegistro, String observaciones) {
        try {
            // Validaciones básicas
            if (productId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "productId es requerido"));
            }
            if (cantidadKg == null || cantidadKg.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "cantidadKg debe ser mayor a 0"));
            }
            if (loteId == null || loteId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "loteId es requerido"));
            }

            // Verificar que el producto existe
            Optional<Product> productOpt = productRepository.findById(productId);
            if (!productOpt.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Producto no encontrado con ID: " + productId));
            }

            Product product = productOpt.get();

            // Registrar movimiento en el sistema actual (movimientos_inventario_producto)
            MovimientoInventarioProducto movimiento = inventarioProductoService.registrarMovimiento(
                productId,
                MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE,
                cantidadKg,
                null, // costoUnitario no requerido para consumos
                loteId,
                usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido",
                observaciones != null ? observaciones : "Consumo de alimento registrado"
            );

            System.out.println("✅ Consumo registrado exitosamente - Movimiento ID: " + movimiento.getId());
            System.out.println("📦 Producto: " + product.getName() + " | Cantidad: " + cantidadKg + " kg | Lote: " + loteId);

            return ResponseEntity.ok().body(Map.of(
                "success", true,
                "message", "Consumo registrado exitosamente",
                "movimientoId", movimiento.getId(),
                "producto", product.getName(),
                "tipoAlimento", product.getTypeFood() != null ? product.getTypeFood().getName() : "N/A",
                "stockAnterior", movimiento.getStockAnterior(),
                "stockNuevo", movimiento.getStockNuevo(),
                "cantidadConsumida", movimiento.getCantidad(),
                "loteId", loteId,
                "fechaRegistro", movimiento.getFechaMovimiento()
            ));

        } catch (RequestException rex) {
            // Errores de negocio (p.ej. stock insuficiente) no deben romper la UI
            System.err.println("⚠️ RequestException registrando consumo: " + rex.getMessage());
            return ResponseEntity.ok().body(Map.of(
                "success", false,
                "error", rex.getMessage()
            ));
        } catch (Exception ex) {
            System.err.println("❌ Error registrando consumo: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Error interno del servidor",
                "details", ex.getMessage()
            ));
        }
    }

    /**
     * ✅ Obtener historial de movimientos para un producto
     */
    public List<MovimientoInventarioProducto> obtenerMovimientosProducto(Long productId) {
        return inventarioProductoService.obtenerMovimientosPorProducto(productId);
    }

    /**
     * ✅ Obtener stock actual de un producto
     */
    public BigDecimal obtenerStockActual(Long productId) {
        return inventarioProductoService.obtenerStockActual(productId);
    }

    /**
     * ✅ Registrar entrada de stock (reposición)
     */
    @Transactional
    public ResponseEntity<?> registrarEntradaStock(Long productId, BigDecimal cantidad, 
                                                  String observaciones, String usuarioRegistro) {
        try {
            MovimientoInventarioProducto movimiento = inventarioProductoService.registrarMovimiento(
                productId,
                MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                cantidad,
                null, // costoUnitario opcional para entradas simples
                null, // Sin lote para entradas
                usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido",
                observaciones != null ? observaciones : "Entrada de stock"
            );

            return ResponseEntity.ok().body(Map.of(
                "success", true,
                "message", "Entrada registrada exitosamente",
                "movimientoId", movimiento.getId(),
                "stockNuevo", movimiento.getStockNuevo(),
                "cantidadAgregada", cantidad
            ));

        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Error registrando entrada",
                "details", ex.getMessage()
            ));
        }
    }
}