package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.InventarioProducto;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.model.InventarioEntradaProducto;
import com.wil.avicola_backend.repository.InventarioProductoRepository;
import com.wil.avicola_backend.repository.MovimientoInventarioProductoRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.InventarioEntradaProductoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventarioProductoService {

    private final InventarioProductoRepository inventarioProductoRepository;
    private final MovimientoInventarioProductoRepository movimientoInventarioProductoRepository;
    private final ProductRepository productRepository;
    private final InventarioEntradaProductoRepository inventarioEntradaProductoRepository;

    @Transactional(readOnly = true)
    public List<InventarioProducto> listar() {
        // Solo lectura: sin crear inventarios ni registrar movimientos
        return inventarioProductoRepository.findAll();
    }

    @Transactional(readOnly = true)
    public InventarioProducto porProducto(Long productId) {
        return inventarioProductoRepository.findByProductId(productId).orElse(null);
    }

    @Transactional
    public InventarioProducto crearSiNoExiste(Long productId, String unidadMedida) {
        InventarioProducto inv = inventarioProductoRepository.findByProductId(productId).orElse(null);
        if (inv != null) return inv;

        Product prod = productRepository.findById(productId)
            .orElseThrow(() -> new RequestException("Producto no encontrado: " + productId));

        inv = InventarioProducto.builder()
            .product(prod)
            .cantidadStock(BigDecimal.ZERO)
            .unidadMedida(unidadMedida != null ? unidadMedida : (prod.getUnitMeasurement() != null ? prod.getUnitMeasurement().getName() : "unidad"))
            .stockMinimo(BigDecimal.ZERO)
            .costoUnitarioPromedio(BigDecimal.ZERO)
            .activo(true)
            .build();
        return inventarioProductoRepository.save(inv);
    }

    @Transactional
    public MovimientoInventarioProducto registrarMovimiento(Long productId,
                                                            MovimientoInventarioProducto.TipoMovimiento tipo,
                                                            BigDecimal cantidad,
                                                            BigDecimal costoUnitario,
                                                            String loteId,
                                                            String usuario,
                                                            String observaciones) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RequestException("Cantidad debe ser > 0");
        }
        InventarioProducto inv = inventarioProductoRepository.findByProductId(productId)
            .orElseGet(() -> crearSiNoExiste(productId, null));

        BigDecimal stockAnterior = inv.getCantidadStock() != null ? inv.getCantidadStock() : BigDecimal.ZERO;
        BigDecimal stockNuevo = stockAnterior;

        switch (tipo) {
            case ENTRADA:
                stockNuevo = stockAnterior.add(cantidad);
                // actualizar costo promedio si viene costoUnitario
                if (costoUnitario != null && costoUnitario.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal costoExistente = inv.getCostoUnitarioPromedio() != null ? inv.getCostoUnitarioPromedio() : BigDecimal.ZERO;
                    // promedio ponderado simple: (stockAnterior*costoAnterior + cantidad*costoUnitario) / (stockAnterior+cantidad)
                    BigDecimal totalCostoAnterior = costoExistente.multiply(stockAnterior);
                    BigDecimal totalCostoEntrada = costoUnitario.multiply(cantidad);
                    BigDecimal totalCantidad = stockAnterior.add(cantidad);
                    if (totalCantidad.compareTo(BigDecimal.ZERO) > 0) {
                        inv.setCostoUnitarioPromedio(totalCostoAnterior.add(totalCostoEntrada).divide(totalCantidad, java.math.RoundingMode.HALF_UP));
                    }
                }
                inv.setCantidadStock(stockNuevo);
                break;
            case SALIDA:
            case CONSUMO_LOTE:
            case AJUSTE:
                if (!inv.tieneStockSuficiente(cantidad)) {
                    throw new RequestException("Stock insuficiente para el producto " + productId);
                }
                stockNuevo = stockAnterior.subtract(cantidad);
                inv.setCantidadStock(stockNuevo);
                break;
            default:
                throw new RequestException("Tipo de movimiento inválido");
        }

        inventarioProductoRepository.save(inv);
        try {
            System.out.println("🧾 [INV] Movimiento preparado -> productId=" + productId +
                ", invId=" + inv.getId() +
                ", tipo=" + tipo +
                ", cantidad=" + cantidad +
                ", stockAnterior=" + stockAnterior +
                ", stockNuevo=" + stockNuevo +
                (loteId != null ? ", loteId=" + loteId : "") +
                (usuario != null ? ", usuario=" + usuario : "")
            );
        } catch (Exception ignore) {}

        MovimientoInventarioProducto mov = MovimientoInventarioProducto.builder()
            .inventarioProducto(inv)
            .tipoMovimiento(tipo)
            .cantidad(cantidad)
            .costoUnitario(costoUnitario)
            .costoTotal(costoUnitario != null ? costoUnitario.multiply(cantidad) : null)
            .stockAnterior(stockAnterior)
            .stockNuevo(stockNuevo)
            .loteId(loteId)
            .usuarioRegistro(usuario != null ? usuario : "API")
            .observaciones(observaciones)
            .build();
        MovimientoInventarioProducto saved = movimientoInventarioProductoRepository.save(mov);
        try {
            System.out.println("✅ [INV] Movimiento guardado id=" + saved.getId() +
                " | productId=" + productId + " | invId=" + inv.getId() +
                " | tipo=" + tipo + " | cantidad=" + cantidad +
                " | stockAnterior=" + stockAnterior + " | stockNuevo=" + stockNuevo);
        } catch (Exception ignore) {}
        return saved;
    }

    /**
     * Crea una entrada vigente básica en inventario_entrada_producto SIN consolidar movimiento,
     * para materializar stock existente (por ejemplo en sincronización inicial o backfill).
     */
    @Transactional
    protected InventarioEntradaProducto crearEntradaBasicaVigente(Long productId, BigDecimal cantidad,
                                                                  String codigoLote, String observaciones) {
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) return null;
        Product prod = productRepository.findById(productId)
            .orElseThrow(() -> new RequestException("Producto no encontrado: " + productId));

        InventarioEntradaProducto e = InventarioEntradaProducto.builder()
            .product(prod)
            .provider(null)
            .codigoLote(codigoLote != null ? codigoLote : "INIT")
            .fechaIngreso(java.time.LocalDateTime.now())
            .fechaVencimiento(null)
            .unidadControl("kg")
            .contenidoPorUnidad(BigDecimal.ONE) // cantidad en unidad base
            .cantidadUnidades(cantidad)
            .costoUnitarioBase(null)
            .costoPorUnidadControl(null)
            .stockUnidadesRestantes(cantidad)
            .stockBaseRestante(cantidad)
            .activo(true)
            .observaciones(observaciones)
            .build();
        return inventarioEntradaProductoRepository.save(e);
    }

    /**
     * ✅ Obtener movimientos por producto
     */
    @Transactional(readOnly = true)
    public List<MovimientoInventarioProducto> obtenerMovimientosPorProducto(Long productId) {
        return movimientoInventarioProductoRepository.findByProductId(productId);
    }

    /**
     * ✅ Obtener stock actual de un producto
     */
    @Transactional(readOnly = true)
    public BigDecimal obtenerStockActual(Long productId) {
        InventarioProducto inv = inventarioProductoRepository.findByProductId(productId).orElse(null);
        return inv != null ? inv.getCantidadStock() : BigDecimal.ZERO;
    }

    // Agregado: suma de disminución por producto (SALIDA + CONSUMO_LOTE)
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> sumDisminucionPorProducto() {
        java.util.List<MovimientoInventarioProducto.TipoMovimiento> tipos = java.util.Arrays.asList(
            MovimientoInventarioProducto.TipoMovimiento.SALIDA,
            MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE
        );
        java.util.List<Object[]> rows = movimientoInventarioProductoRepository.sumCantidadByTiposGroupByProduct(tipos);
        Map<Long, BigDecimal> map = new HashMap<>();
        if (rows != null) {
            for (Object[] r : rows) {
                if (r == null || r.length < 2) continue;
                Long pid = (Long) r[0];
                BigDecimal sum = (BigDecimal) r[1];
                map.put(pid, sum != null ? sum : BigDecimal.ZERO);
            }
        }
        return map;
    }

    /**
     * Sincroniza un producto puntual: crea inventario si falta y, si stock<=0 y Product.quantity>0,
     * registra una ENTRADA inicial por Product.quantity.
     */
    @Transactional
    public Map<String, Object> sincronizarDesdeProduct(Long productId, String usuario, String observaciones) {
        Map<String, Object> r = new HashMap<>();
        r.put("productId", productId);
        r.put("success", false);

        Product p = productRepository.findById(productId)
            .orElseThrow(() -> new RequestException("Producto no encontrado: " + productId));

        InventarioProducto inv = inventarioProductoRepository.findByProductId(productId)
            .orElseGet(() -> crearSiNoExiste(productId, null));

        BigDecimal stockActual = inv.getCantidadStock() != null ? inv.getCantidadStock() : BigDecimal.ZERO;
        int qtyProducto = p.getQuantity();
        boolean hizoEntrada = false;
        if (stockActual.compareTo(BigDecimal.ZERO) <= 0 && qtyProducto > 0) {
            registrarMovimiento(
                productId,
                MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                new BigDecimal(qtyProducto),
                null,
                null,
                usuario != null ? usuario : "Sistema",
                observaciones != null ? observaciones : "Inicialización automática desde Product.quantity (sincronizar-uno)"
            );
            hizoEntrada = true;
            // Materializar también como ENTRADA vigente para FEFO
            crearEntradaBasicaVigente(
                productId,
                new BigDecimal(qtyProducto),
                "INIT",
                "Entrada inicial materializada (sincronizar-uno)"
            );
        }

        r.put("inventarioId", inv.getId());
        r.put("hizoEntrada", hizoEntrada);
        r.put("success", true);
        return r;
    }

    // ==========================================================
    // Sincronización masiva de inventarios
    // ==========================================================
    @Transactional
    public Map<String, Object> sincronizarTodos(boolean soloAlimentos) {
        Iterable<Product> productos = productRepository.findAll();
        int creados = 0;
        int entradas = 0;
        int entradasMaterializadas = 0;
        int omitidos = 0;
        int totalConsiderados = 0;

        for (Product p : productos) {
            // Omitir productos inactivos
            if (p == null || p.getActive() == null || !p.getActive()) {
                omitidos++;
                continue;
            }

            // Si soloAlimentos=true, excluir vacunas/medicamentos por nombre de TypeFood
            if (soloAlimentos && esProductoNoComestible(p)) {
                omitidos++;
                continue;
            }
            totalConsiderados++;

            InventarioProducto inv = inventarioProductoRepository.findByProductId(p.getId()).orElse(null);
            if (inv == null) {
                inv = crearSiNoExiste(p.getId(), null);
                creados++;
            }

            BigDecimal stockActual = inv.getCantidadStock() != null ? inv.getCantidadStock() : BigDecimal.ZERO;
            int qtyProducto = p.getQuantity();
            if (stockActual.compareTo(BigDecimal.ZERO) <= 0 && qtyProducto > 0) {
                registrarMovimiento(
                    p.getId(),
                    MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                    new BigDecimal(qtyProducto),
                    null,
                    null,
                    "Sistema",
                    "Inicialización automática desde Product.quantity (sincronizar-todos)"
                );
                entradas++;
                crearEntradaBasicaVigente(
                    p.getId(),
                    new BigDecimal(qtyProducto),
                    "INIT",
                    "Entrada inicial materializada (sincronizar-todos)"
                );
                entradasMaterializadas++;
            }
        }

        Map<String, Object> r = new HashMap<>();
        r.put("success", true);
        r.put("totalProductosConsiderados", totalConsiderados);
        r.put("inventariosCreados", creados);
        r.put("entradasRegistradas", entradas);
        r.put("entradasMaterializadas", entradasMaterializadas);
        r.put("omitidos", omitidos);
        return r;
    }

    private boolean esProductoNoComestible(Product p) {
        try {
            TypeFood tf = p.getTypeFood();
            if (tf == null || tf.getName() == null) return false;
            String n = tf.getName().toLowerCase();
            return n.contains("vacun") || n.contains("medic") || n.contains("antibi") || n.contains("antiparasit") || n.contains("desparasit") || n.contains("antisept") || n.contains("antisépt") || n.contains("desinfect");
        } catch (Exception e) {
            return false;
        }
    }

    // ==========================================================
    // Backfill de entradas vigentes para reconciliar consolidado vs entradas
    // ==========================================================
    @Transactional
    public Map<String, Object> backfillEntradas(boolean soloAlimentos) {
        Iterable<Product> productos = productRepository.findAll();
        int considerados = 0;
        int creadas = 0;
        int omitidos = 0;

        for (Product p : productos) {
            if (p == null || p.getActive() == null || !p.getActive()) { omitidos++; continue; }
            if (soloAlimentos && esProductoNoComestible(p)) { omitidos++; continue; }
            considerados++;

            InventarioProducto inv = inventarioProductoRepository.findByProductId(p.getId()).orElse(null);
            BigDecimal stockTotal = inv != null && inv.getCantidadStock() != null ? inv.getCantidadStock() : BigDecimal.ZERO;

            java.util.Optional<java.math.BigDecimal> sumOpt = inventarioEntradaProductoRepository.sumStockBaseRestante(p.getId());
            BigDecimal sumaEntradas = sumOpt.orElse(BigDecimal.ZERO);
            BigDecimal faltante = stockTotal.subtract(sumaEntradas);
            if (faltante.compareTo(BigDecimal.ZERO) > 0) {
                crearEntradaBasicaVigente(
                    p.getId(),
                    faltante,
                    "BACKFILL",
                    "Backfill vigente para materializar stock consolidado"
                );
                creadas++;
            }
        }

        Map<String, Object> r = new HashMap<>();
        r.put("success", true);
        r.put("productosConsiderados", considerados);
        r.put("entradasCreadas", creadas);
        r.put("omitidos", omitidos);
        return r;
    }
}
