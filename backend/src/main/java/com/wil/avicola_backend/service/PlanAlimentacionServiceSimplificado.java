package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.repository.ProductRepository;

/**
 * ✅ SERVICIO FEFO ESTRICTO PARA PLAN ALIMENTACIÓN
 * ÚNICA FUENTE DE VERDAD: inventario_entrada_producto (FEFO)
 * 
 * CAMBIO PROFESIONAL: Todo el stock DEBE estar en entradas FEFO
 * NO hay fallback a consolidado - Trazabilidad completa
 */
@Service("planAlimentacionServiceSimplificado")
public class PlanAlimentacionServiceSimplificado {

    @Autowired
    private InventarioSimplificadoService inventarioSimplificadoService;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventarioEntradaProductoService inventarioEntradaProductoService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * ✅ MÉTODO PRINCIPAL QUE RESUELVE EL ERROR 400
     * Reemplaza el método problemático que causaba error en sanitizarInventario()
     */
    public ResponseEntity<?> registrarConsumoAlimentoPorProducto(
            String loteId,
            Long tipoAlimentoId,
            Long productId,
            BigDecimal cantidadKg,
            String usuarioRegistro,
            String observaciones) {
        return registrarConsumoAlimentoPorProducto(loteId, tipoAlimentoId, productId, cantidadKg, usuarioRegistro, observaciones, null);
    }

    public ResponseEntity<?> registrarConsumoAlimentoPorProducto(
            String loteId,
            Long tipoAlimentoId,
            Long productId,
            BigDecimal cantidadKg,
            String usuarioRegistro,
            String observaciones,
            LocalDate fechaRegistro) {
        
        System.out.println("🍽️ [SIMPLIFICADO] Registrando consumo de alimento:");
        System.out.println("   - Lote ID: " + loteId);
        System.out.println("   - Product ID: " + productId);
        System.out.println("   - Cantidad: " + cantidadKg + " kg");
        System.out.println("   - Usuario: " + usuarioRegistro);

        try {
            // Validaciones básicas (sin romper la UI)
            if (loteId == null || loteId.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "loteId es requerido"
                ));
            }
            if (productId == null) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "productId es requerido"
                ));
            }
            if (cantidadKg == null || cantidadKg.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "cantidadKg debe ser mayor a 0"
                ));
            }

            // Verificar que el producto existe y que su tipo controla stock
            Optional<Product> prodOpt = productRepository.findById(productId);
            if (prodOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Producto no encontrado con ID: " + productId
                ));
            }
            Product producto = prodOpt.get();
            if (!controlaStock(producto)) {
                // No descontar inventario si el tipo no controla stock
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Tipo de producto configurado para NO controlar stock",
                    "productoId", productId,
                    "skipped", true
                ));
            }

            // ✅ Nuevo flujo: intentar consumo FEFO por entradas de producto
            Map<String, Object> rfefo = inventarioEntradaProductoService.consumirPorProductoFefo(
                productId, cantidadKg, loteId, usuarioRegistro, observaciones, fechaRegistro
            );

            BigDecimal consumido = (BigDecimal) rfefo.getOrDefault("cantidadConsumida", BigDecimal.ZERO);
            BigDecimal pendiente = (BigDecimal) rfefo.getOrDefault("cantidadPendiente", BigDecimal.ZERO);
            boolean bloqueoPorVencido = Boolean.TRUE.equals(rfefo.get("bloqueoPorVencido"));

            if (consumido.compareTo(BigDecimal.ZERO) > 0) {
                System.out.println("✅ Consumo FEFO registrado (producto específico)");
                try {
                    messagingTemplate.convertAndSend("/topic/inventory-update", "INVENTORY_CHANGED_PRODUCT");
                } catch (Exception ignore) {}
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", pendiente.compareTo(BigDecimal.ZERO) == 0 ? "Consumo registrado exitosamente" : "Consumo parcial registrado por stock insuficiente",
                    "productoId", productId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", consumido,
                    "cantidadPendiente", pendiente.max(BigDecimal.ZERO),
                    "loteId", loteId,
                    "movimientoId", rfefo.get("movimientoId")
                ));
            }

            if (bloqueoPorVencido) {
                // No permitir consumo desde entradas vencidas
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Stock disponible pero vencido para el producto ID: " + productId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", BigDecimal.ZERO,
                    "bloqueoPorVencido", true
                ));
            }

            // ❌ FEFO ESTRICTO: NO hay fallback a consolidado
            // Si no hay entradas FEFO, el stock es realmente 0
            System.out.println("❌ [FEFO ESTRICTO] No hay stock disponible en entradas FEFO para producto " + productId);
            System.out.println("   Solución: Crear entradas en inventario con lote, vencimiento y trazabilidad");
            
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", "Stock insuficiente en sistema FEFO para el producto ID: " + productId + 
                        ". Debe registrar entradas con trazabilidad (lote, vencimiento, proveedor).",
                "cantidadSolicitada", cantidadKg,
                "cantidadConsumida", BigDecimal.ZERO,
                "sugerencia", "Registre una entrada de inventario con código de lote y fecha de vencimiento",
                "fefoEstricto", true
            ));

        } catch (RuntimeException rex) {
            System.err.println("⚠️ Error de negocio en servicio simplificado: " + rex.getMessage());
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", rex.getMessage()
            ));
        } catch (Exception ex) {
            System.err.println("❌ Error en servicio simplificado: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", "Error interno del servidor",
                "details", ex.getMessage()
            ));
        }
    }

    /**
     * ✅ Método para registrar consumo por tipo de alimento
     * Busca un producto del tipo especificado y registra el consumo
     */
    public ResponseEntity<?> registrarConsumoAlimento(
            String loteId,
            Long tipoAlimentoId,
            BigDecimal cantidadKg,
            String usuarioRegistro,
            String observaciones) {
        return registrarConsumoAlimento(loteId, tipoAlimentoId, cantidadKg, usuarioRegistro, observaciones, null);
    }

    public ResponseEntity<?> registrarConsumoAlimento(
            String loteId,
            Long tipoAlimentoId,
            BigDecimal cantidadKg,
            String usuarioRegistro,
            String observaciones,
            LocalDate fechaRegistro) {
        
        System.out.println("🍽️ [SIMPLIFICADO] Registrando consumo por tipo de alimento:");
        System.out.println("   - Lote ID: " + loteId);
        System.out.println("   - Tipo Alimento ID: " + tipoAlimentoId);
        System.out.println("   - Cantidad: " + cantidadKg + " kg");

        try {
            // Validaciones básicas (sin romper la UI)
            if (loteId == null || loteId.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "loteId es requerido"
                ));
            }
            if (tipoAlimentoId == null) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "tipoAlimentoId es requerido"
                ));
            }
            if (cantidadKg == null || cantidadKg.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "cantidadKg debe ser mayor a 0"
                ));
            }

            // Intento FEFO por tipo: entradas válidas de todos los productos del tipo
            Map<String, Object> rfefoTipo = inventarioEntradaProductoService.consumirPorTipoFefo(
                tipoAlimentoId, cantidadKg, loteId, usuarioRegistro, observaciones, true, fechaRegistro
            );

            BigDecimal consumidoTipo = (BigDecimal) rfefoTipo.getOrDefault("cantidadConsumida", BigDecimal.ZERO);
            BigDecimal pendienteTipo = (BigDecimal) rfefoTipo.getOrDefault("cantidadPendiente", BigDecimal.ZERO);
            boolean bloqueoVencido = Boolean.TRUE.equals(rfefoTipo.get("bloqueoPorVencido"));
            if (consumidoTipo.compareTo(BigDecimal.ZERO) > 0) {
                boolean completo = pendienteTipo.compareTo(BigDecimal.ZERO) == 0;
                System.out.println("✅ Consumo por tipo (FEFO) registrado: consumido=" + consumidoTipo + ", pendiente=" + pendienteTipo);
                try {
                    messagingTemplate.convertAndSend("/topic/inventory-update", "INVENTORY_CHANGED_TYPE");
                } catch (Exception ignore) {}
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", completo ? "Consumo registrado exitosamente" : "Consumo parcial registrado por stock insuficiente",
                    "tipoAlimentoId", tipoAlimentoId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", consumidoTipo,
                    "cantidadPendiente", pendienteTipo.max(BigDecimal.ZERO),
                    "loteId", loteId,
                    "detalles", rfefoTipo.get("detalles")
                ));
            }

            if (bloqueoVencido) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Stock disponible pero vencido para el tipo de alimento ID: " + tipoAlimentoId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", BigDecimal.ZERO,
                    "bloqueoPorVencido", true
                ));
            }

            // ❌ FEFO ESTRICTO: NO hay fallback a consolidado
            // Si no hay entradas FEFO para este tipo, el stock es realmente 0
            System.out.println("❌ [FEFO ESTRICTO] No hay stock disponible en entradas FEFO para tipo " + tipoAlimentoId);
            System.out.println("   Solución: Crear entradas de inventario para productos de este tipo con lote, vencimiento y trazabilidad");
            
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", "Stock insuficiente en sistema FEFO para el tipo de alimento ID: " + tipoAlimentoId + 
                        ". Debe registrar entradas con trazabilidad (lote, vencimiento, proveedor) para productos de este tipo.",
                "cantidadSolicitada", cantidadKg,
                "cantidadConsumida", BigDecimal.ZERO,
                "sugerencia", "Registre entradas de inventario con código de lote y fecha de vencimiento para productos de este tipo",
                "fefoEstricto", true
            ));

        } catch (RuntimeException rex) {
            System.err.println("⚠️ Error de negocio registrando consumo por tipo: " + rex.getMessage());
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", rex.getMessage(),
                "tipo", "registro_consumo_tipo_alimento"
            ));
        } catch (Exception ex) {
            System.err.println("❌ Error registrando consumo por tipo: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", "Error procesando solicitud: " + ex.getMessage(),
                "tipo", "registro_consumo_tipo_alimento"
            ));
        }
    }

    // ==========================================================
    // Helpers de validación de tipo de producto (dinámico)
    // ==========================================================
    private boolean controlaStock(Product p) {
        try {
            if (p == null || p.getTypeFood() == null) return true; // por defecto controlar si falta dato
            Boolean flag = p.getTypeFood().getControlaStock();
            if (flag != null) return flag;
            // Fallback a lógica por nombre si no hay bandera configurada
            String tf = p.getTypeFood().getName();
            if (tf == null) return true;
            return !esTipoNoComestible(tf.toLowerCase());
        } catch (Exception e) {
            return true;
        }
    }

    private boolean esTipoNoComestible(String typeFoodNameLower) {
        if (typeFoodNameLower == null) return false;
        // Palabras clave de exclusión (vacunas/medicamentos y afines). Dinámico por nombre.
        String n = typeFoodNameLower;
        return n.contains("vacun") ||
               n.contains("medic") ||
               n.contains("antibi") ||
               n.contains("antiparasit") ||
               n.contains("desparasit") ||
               n.contains("antisept") ||
               n.contains("antisépt") ||
               n.contains("desinfect");
    }
}