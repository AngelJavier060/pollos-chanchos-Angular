package com.wil.avicola_backend.service;

import java.math.BigDecimal;
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
 * ✅ SERVICIO SIMPLIFICADO PARA PLAN ALIMENTACIÓN
 * Solo maneja movimientos_inventario_producto - Sin sistemas obsoletos
 * 
 * SOLUCIONA: Error 400 Bad Request en sanitizarInventario()
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
                productId, cantidadKg, loteId, usuarioRegistro, observaciones
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

            // ⚠️ Compatibilidad: si no hay entradas, intentar consumo consolidado clásico
            BigDecimal stockActual = inventarioSimplificadoService.obtenerStockActual(productId);
            if (stockActual == null) stockActual = BigDecimal.ZERO;

            // Auto-inicializar inventario si no existe o está en 0 y el producto tiene quantity > 0
            if (stockActual.compareTo(BigDecimal.ZERO) <= 0) {
                try {
                    int qtyProducto = producto.getQuantity();
                    if (qtyProducto > 0) {
                        System.out.println("ℹ️ Inicializando inventario de producto " + productId + " con Product.quantity=" + qtyProducto);
                        inventarioSimplificadoService.registrarEntradaStock(
                            productId,
                            new BigDecimal(qtyProducto),
                            "Inicialización automática desde Product.quantity (modo estricto)",
                            usuarioRegistro
                        );
                        stockActual = inventarioSimplificadoService.obtenerStockActual(productId);
                        if (stockActual == null) stockActual = BigDecimal.ZERO;
                    }
                } catch (Exception initEx) {
                    System.err.println("⚠️ Error intentando inicializar inventario: " + initEx.getMessage());
                }
            }

            if (stockActual.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Stock insuficiente para el producto ID: " + productId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", java.math.BigDecimal.ZERO
                ));
            }

            BigDecimal aConsumir = cantidadKg.min(stockActual);
            ResponseEntity<?> r1 = inventarioSimplificadoService.registrarConsumoAlimento(
                productId, aConsumir, loteId, usuarioRegistro, observaciones
            );
            try {
                messagingTemplate.convertAndSend("/topic/inventory-update", "INVENTORY_CHANGED_PRODUCT");
            } catch (Exception ignore) {}

            BigDecimal restante = cantidadKg.subtract(aConsumir);
            if (restante.compareTo(BigDecimal.ZERO) > 0) {
                // Sin fallback por tipo en modo estricto
                try {
                    messagingTemplate.convertAndSend("/topic/inventory-update", "INVENTORY_CHANGED_PRODUCT");
                } catch (Exception ignore) {}
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Consumo parcial en producto (sin entradas registradas)",
                    "productoId", productId,
                    "cantidadSolicitada", cantidadKg,
                    "cantidadConsumida", aConsumir,
                    "cantidadPendiente", restante,
                    "loteId", loteId
                ));
            }

            System.out.println("✅ Consumo registrado (producto específico - consolidado)");
            return r1;

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
                tipoAlimentoId, cantidadKg, loteId, usuarioRegistro, observaciones, true
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

            // Fallback: comportamiento consolidado clásico (FIFO por date_compra)
            List<Product> productos = productRepository.findByTypeFood_Id(tipoAlimentoId);
            if (productos != null && !productos.isEmpty()) {
                productos = productos.stream()
                    .filter(this::controlaStock)
                    .collect(Collectors.toList());
            }
            if (productos == null || productos.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "No existen productos asociados al tipo ID: " + tipoAlimentoId,
                    "sugerencia", "Cree al menos un producto con ese tipo o registre entradas"
                ));
            }

            productos.sort((p1, p2) -> {
                java.util.Date d1 = p1.getDate_compra();
                java.util.Date d2 = p2.getDate_compra();
                if (d1 == null && d2 == null) return 0;
                if (d1 == null) return 1;
                if (d2 == null) return -1;
                return d1.compareTo(d2);
            });

            BigDecimal restante = cantidadKg;
            BigDecimal consumidoTotal = BigDecimal.ZERO;
            for (Product p : productos) {
                if (restante.compareTo(BigDecimal.ZERO) <= 0) break;
                BigDecimal stockActual = inventarioSimplificadoService.obtenerStockActual(p.getId());
                if (stockActual == null) stockActual = BigDecimal.ZERO;
                if (stockActual.compareTo(BigDecimal.ZERO) <= 0) continue;
                BigDecimal aConsumir = stockActual.min(restante);
                inventarioSimplificadoService.registrarConsumoAlimento(
                    p.getId(), aConsumir, loteId, usuarioRegistro, observaciones
                );
                consumidoTotal = consumidoTotal.add(aConsumir);
                restante = restante.subtract(aConsumir);
            }

            if (consumidoTotal.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Stock insuficiente para el tipo de alimento ID: " + tipoAlimentoId,
                    "detalle", "No se encontró stock disponible en ningún producto del tipo",
                    "cantidadConsumida", java.math.BigDecimal.ZERO
                ));
            }

            boolean completo = restante.compareTo(BigDecimal.ZERO) == 0;
            System.out.println("✅ Consumo por tipo registrado (fallback consolidado) consumido=" + consumidoTotal + ", pendiente=" + restante.max(BigDecimal.ZERO));
            try {
                messagingTemplate.convertAndSend("/topic/inventory-update", "INVENTORY_CHANGED_TYPE");
            } catch (Exception ignore) {}
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", completo ? "Consumo registrado exitosamente" : "Consumo parcial registrado por stock insuficiente",
                "tipoAlimentoId", tipoAlimentoId,
                "cantidadSolicitada", cantidadKg,
                "cantidadConsumida", consumidoTotal,
                "cantidadPendiente", restante.max(BigDecimal.ZERO),
                "loteId", loteId
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