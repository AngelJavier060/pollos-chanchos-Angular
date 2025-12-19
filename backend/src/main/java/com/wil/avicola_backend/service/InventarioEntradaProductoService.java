package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.ConsumoEntradaProducto;
import com.wil.avicola_backend.model.InventarioEntradaProducto;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;
import com.wil.avicola_backend.model.Provider;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.repository.ConsumoEntradaProductoRepository;
import com.wil.avicola_backend.repository.InventarioEntradaProductoRepository;
import com.wil.avicola_backend.repository.ProviderRepository;
import com.wil.avicola_backend.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventarioEntradaProductoService {

    private final InventarioEntradaProductoRepository entradasRepo;
    private final ConsumoEntradaProductoRepository consumoRepo;
    private final ProductRepository productRepository;
    private final ProviderRepository providerRepository;
    private final InventarioProductoService inventarioProductoService;

    @Transactional
    public InventarioEntradaProducto registrarEntrada(
            Long productId,
            String codigoLote,
            java.time.LocalDateTime fechaIngreso,
            java.time.LocalDate fechaVencimiento,
            String unidadControl,
            BigDecimal contenidoPorUnidadBase,
            BigDecimal cantidadUnidades,
            String observaciones,
            Long providerId,
            BigDecimal costoUnitarioBase,
            BigDecimal costoPorUnidadControl
    ) {
        Product p = productRepository.findById(productId)
            .orElseThrow(() -> new RequestException("Producto no encontrado: " + productId));
        Provider prov = null;
        if (providerId != null) {
            prov = providerRepository.findById(providerId).orElse(null);
        }

        if (contenidoPorUnidadBase == null || contenidoPorUnidadBase.compareTo(BigDecimal.ZERO) <= 0)
            throw new RequestException("contenidoPorUnidad debe ser > 0");
        if (cantidadUnidades == null || cantidadUnidades.compareTo(BigDecimal.ZERO) <= 0)
            throw new RequestException("cantidadUnidades debe ser > 0");

        BigDecimal stockBase = contenidoPorUnidadBase.multiply(cantidadUnidades);

        // Calcular costo unitario base si no viene pero existe costo por unidad de control
        if ((costoUnitarioBase == null || costoUnitarioBase.compareTo(BigDecimal.ZERO) <= 0)
            && costoPorUnidadControl != null && costoPorUnidadControl.compareTo(BigDecimal.ZERO) > 0
            && contenidoPorUnidadBase != null && contenidoPorUnidadBase.compareTo(BigDecimal.ZERO) > 0) {
            try {
                costoUnitarioBase = costoPorUnidadControl.divide(contenidoPorUnidadBase, java.math.RoundingMode.HALF_UP);
            } catch (Exception ignore) {}
        }

        InventarioEntradaProducto e = InventarioEntradaProducto.builder()
            .product(p)
            .provider(prov)
            .codigoLote(codigoLote)
            .fechaIngreso(fechaIngreso != null ? fechaIngreso : java.time.LocalDateTime.now())
            .fechaVencimiento(fechaVencimiento)
            .unidadControl(unidadControl)
            .contenidoPorUnidad(contenidoPorUnidadBase)
            .cantidadUnidades(cantidadUnidades)
            .costoUnitarioBase(costoUnitarioBase)
            .costoPorUnidadControl(costoPorUnidadControl)
            .stockUnidadesRestantes(cantidadUnidades)
            .stockBaseRestante(stockBase)
            .activo(true)
            .observaciones(observaciones)
            .build();
        e = entradasRepo.save(e);

        // Aumentar el inventario consolidado
        inventarioProductoService.registrarMovimiento(
            productId,
            MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
            stockBase,
            costoUnitarioBase,
            null,
            "Sistema",
            "Entrada consolidada por creación de lote de producto"
        );

        return e;
    }

    /**
     * Consume stock por FEFO para un producto en unidad base (kg, g, ml).
     * Devuelve mapa con: success, cantidadConsumida, cantidadPendiente, bloqueoVencido, movimientoId, detalles
     */
    @Transactional
    public Map<String, Object> consumirPorProductoFefo(Long productId, BigDecimal cantidadBaseSolicitada,
                                                       String loteId, String usuario, String observaciones) {
        return consumirPorProductoFefo(productId, cantidadBaseSolicitada, loteId, usuario, observaciones, null);
    }

    @Transactional
    public Map<String, Object> consumirPorProductoFefo(Long productId, BigDecimal cantidadBaseSolicitada,
                                                       String loteId, String usuario, String observaciones,
                                                       java.time.LocalDate fechaRegistro) {
        if (cantidadBaseSolicitada == null || cantidadBaseSolicitada.compareTo(BigDecimal.ZERO) <= 0)
            throw new RequestException("cantidad debe ser > 0");

        Product p = productRepository.findById(productId)
            .orElseThrow(() -> new RequestException("Producto no encontrado: " + productId));

        List<InventarioEntradaProducto> entradas = entradasRepo.findActivasPorProducto(productId);
        LocalDate hoy = LocalDate.now();

        // separar expiradas y válidas
        List<InventarioEntradaProducto> expiradas = new ArrayList<>();
        List<InventarioEntradaProducto> validas = new ArrayList<>();
        for (InventarioEntradaProducto e : entradas) {
            if (e.getStockBaseRestante() == null || e.getStockBaseRestante().compareTo(BigDecimal.ZERO) <= 0) continue;
            if (e.getFechaVencimiento() != null && e.getFechaVencimiento().isBefore(hoy)) {
                expiradas.add(e);
            } else {
                validas.add(e);
            }
        }

        // Orden FEFO: primero por fechaVencimiento asc (nulos al final), luego por fechaIngreso asc
        validas.sort(Comparator
            .comparing((InventarioEntradaProducto e) -> e.getFechaVencimiento(), Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(e -> e.getFechaIngreso(), Comparator.nullsLast(Comparator.naturalOrder()))
        );

        BigDecimal restante = cantidadBaseSolicitada;
        BigDecimal consumido = BigDecimal.ZERO;
        List<Map<String, Object>> detalles = new ArrayList<>();

        for (InventarioEntradaProducto e : validas) {
            if (restante.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal disponible = e.getStockBaseRestante() != null ? e.getStockBaseRestante() : BigDecimal.ZERO;
            if (disponible.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal aTomar = disponible.min(restante);
            if (aTomar.compareTo(BigDecimal.ZERO) <= 0) continue;

            // actualizar entrada
            e.setStockBaseRestante(disponible.subtract(aTomar));
            // actualizar unidades restantes en proporción si tenemos contenidoPorUnidad
            if (e.getContenidoPorUnidad() != null && e.getContenidoPorUnidad().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal unidadesConsumidas = aTomar.divide(e.getContenidoPorUnidad(), java.math.MathContext.DECIMAL64);
                BigDecimal unidadesRestantes = (e.getStockUnidadesRestantes() != null ? e.getStockUnidadesRestantes() : BigDecimal.ZERO)
                    .subtract(unidadesConsumidas);
                e.setStockUnidadesRestantes(unidadesRestantes.max(BigDecimal.ZERO));
            }
            // desactivar si quedó en 0
            if (e.getStockBaseRestante().compareTo(BigDecimal.ZERO) == 0) e.setActivo(false);
            entradasRepo.save(e);

            Map<String, Object> d = new HashMap<>();
            d.put("entradaId", e.getId());
            d.put("codigoLote", e.getCodigoLote());
            d.put("fechaVencimiento", e.getFechaVencimiento());
            d.put("consumido", aTomar);
            d.put("stockBaseRestante", e.getStockBaseRestante());
            detalles.add(d);

            consumido = consumido.add(aTomar);
            restante = restante.subtract(aTomar);
        }

        boolean bloqueoPorVencido = false;
        if (consumido.compareTo(BigDecimal.ZERO) == 0 && !expiradas.isEmpty()) {
            // hay stock pero todo está vencido
            bloqueoPorVencido = true;
        }

        // Registrar movimiento consolidado por lo realmente consumido (si > 0)
        Long movimientoId = null;
        if (consumido.compareTo(BigDecimal.ZERO) > 0) {
            // Usar la hora actual para que coincida con createDate del PlanEjecucion
            java.time.LocalDateTime fechaMov = java.time.LocalDateTime.now();
            if (fechaRegistro != null && !fechaRegistro.equals(java.time.LocalDate.now())) {
                // Solo usar hora fija si la fecha es diferente al día actual (registro histórico)
                fechaMov = fechaRegistro.atTime(java.time.LocalTime.now());
            }
            MovimientoInventarioProducto mov = inventarioProductoService.registrarMovimientoConFecha(
                productId,
                MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE,
                consumido,
                null,
                loteId,
                usuario != null ? usuario : "Sistema",
                observaciones != null ? observaciones : "Consumo FEFO",
                fechaMov
            );
            movimientoId = mov.getId();

            // Registrar detalle por entrada
            for (Map<String, Object> d : detalles) {
                BigDecimal cant = (BigDecimal) d.get("consumido");
                if (cant == null || cant.compareTo(BigDecimal.ZERO) <= 0) continue;
                InventarioEntradaProducto entrada = entradasRepo.findById((Long) d.get("entradaId"))
                    .orElse(null);
                if (entrada == null) continue;
                ConsumoEntradaProducto ce = ConsumoEntradaProducto.builder()
                    .movimiento(mov)
                    .entrada(entrada)
                    .cantidadBaseConsumida(cant)
                    .cantidadUnidadesConsumidas(entrada.getContenidoPorUnidad() != null && entrada.getContenidoPorUnidad().compareTo(BigDecimal.ZERO) > 0
                        ? cant.divide(entrada.getContenidoPorUnidad(), java.math.MathContext.DECIMAL64) : null)
                    .observaciones(observaciones)
                    .build();
                consumoRepo.save(ce);
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", consumido.compareTo(BigDecimal.ZERO) > 0);
        resp.put("productoId", productId);
        resp.put("cantidadSolicitada", cantidadBaseSolicitada);
        resp.put("cantidadConsumida", consumido);
        resp.put("cantidadPendiente", restante.max(BigDecimal.ZERO));
        resp.put("bloqueoPorVencido", bloqueoPorVencido);
        resp.put("movimientoId", movimientoId);
        resp.put("detalles", detalles);
        return resp;
    }

    // ============================
    // Listados y alertas
    // ============================
    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarActivasPorProducto(Long productId) {
        return entradasRepo.findActivasPorProducto(productId);
    }

    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarTodasActivas() {
        return entradasRepo.findAllActivas();
    }

    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarVencidasPorProducto(Long productId) {
        return entradasRepo.findVencidasPorProducto(productId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarPorVencerPorProducto(Long productId, int dias) {
        LocalDate hoy = LocalDate.now();
        LocalDate hasta = hoy.plusDays(dias > 0 ? dias : 15);
        return entradasRepo.findPorVencerPorProducto(productId, hoy, hasta);
    }

    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarVencidasGlobal() {
        return entradasRepo.findVencidasGlobal(LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<InventarioEntradaProducto> listarPorVencerGlobal(int dias) {
        LocalDate hoy = LocalDate.now();
        LocalDate hasta = hoy.plusDays(dias > 0 ? dias : 15);
        return entradasRepo.findPorVencerGlobal(hoy, hasta);
    }

    // ============================
    // Agregaciones
    // ============================
    @Transactional(readOnly = true)
    public Map<Long, java.math.BigDecimal> obtenerStockValidoAgrupado() {
        LocalDate hoy = LocalDate.now();
        List<Object[]> rows = entradasRepo.sumValidStockGroupByProduct(hoy);
        Map<Long, java.math.BigDecimal> map = new HashMap<>();
        if (rows != null) {
            for (Object[] r : rows) {
                if (r == null || r.length < 2) continue;
                Long pid = (Long) r[0];
                java.math.BigDecimal sum = (java.math.BigDecimal) r[1];
                map.put(pid, sum != null ? sum : java.math.BigDecimal.ZERO);
            }
        }
        return map;
    }

    // ============================
    // Edición y eliminación (soft delete)
    // ============================
    @Transactional
    public InventarioEntradaProducto actualizarEntradaMetadata(Long entradaId,
                                                               String codigoLote,
                                                               java.time.LocalDateTime fechaIngreso,
                                                               java.time.LocalDate fechaVencimiento,
                                                               String unidadControl,
                                                               String observaciones,
                                                               Long providerId,
                                                               java.math.BigDecimal costoUnitarioBase,
                                                               java.math.BigDecimal costoPorUnidadControl,
                                                               java.math.BigDecimal contenidoPorUnidadBase,
                                                               java.math.BigDecimal cantidadUnidades) {
        InventarioEntradaProducto e = entradasRepo.findById(entradaId)
            .orElseThrow(() -> new RequestException("Entrada no encontrada: " + entradaId));

        // Solo metadata, no tocar cantidades para no desbalancear inventario consolidado
        if (codigoLote != null) e.setCodigoLote(codigoLote);
        if (fechaIngreso != null) e.setFechaIngreso(fechaIngreso);
        // Permitir poner null (sin vencimiento) o fecha
        e.setFechaVencimiento(fechaVencimiento);
        if (unidadControl != null) e.setUnidadControl(unidadControl);
        if (observaciones != null) e.setObservaciones(observaciones);
        if (costoUnitarioBase != null) e.setCostoUnitarioBase(costoUnitarioBase);
        if (costoPorUnidadControl != null) e.setCostoPorUnidadControl(costoPorUnidadControl);

        if (providerId != null) {
            Provider prov = providerRepository.findById(providerId).orElse(null);
            e.setProvider(prov);
        }
        // Ajustes de cantidades si vienen nuevos valores
        java.math.BigDecimal oldContenido = e.getContenidoPorUnidad();
        java.math.BigDecimal oldCantidad = e.getCantidadUnidades();
        java.math.BigDecimal oldStockBaseRest = e.getStockBaseRestante() != null ? e.getStockBaseRestante() : java.math.BigDecimal.ZERO;

        boolean cambiarCantidades = (contenidoPorUnidadBase != null && contenidoPorUnidadBase.compareTo(java.math.BigDecimal.ZERO) > 0)
                                 || (cantidadUnidades != null && cantidadUnidades.compareTo(java.math.BigDecimal.ZERO) > 0);
        if (cambiarCantidades) {
            java.math.BigDecimal cont = (contenidoPorUnidadBase != null ? contenidoPorUnidadBase : (oldContenido != null ? oldContenido : java.math.BigDecimal.ZERO));
            java.math.BigDecimal cant = (cantidadUnidades != null ? cantidadUnidades : (oldCantidad != null ? oldCantidad : java.math.BigDecimal.ZERO));
            // Total original y consumido
            java.math.BigDecimal oldTotal = (oldContenido != null ? oldContenido : java.math.BigDecimal.ZERO)
                .multiply(oldCantidad != null ? oldCantidad : java.math.BigDecimal.ZERO);
            java.math.BigDecimal consumidoBase = oldTotal.subtract(oldStockBaseRest);
            if (consumidoBase.compareTo(java.math.BigDecimal.ZERO) < 0) consumidoBase = java.math.BigDecimal.ZERO;

            java.math.BigDecimal newTotal = cont.multiply(cant);
            java.math.BigDecimal newStockBaseRest = newTotal.subtract(consumidoBase);
            if (newStockBaseRest.compareTo(java.math.BigDecimal.ZERO) < 0) newStockBaseRest = java.math.BigDecimal.ZERO;

            // Unidades restantes estimadas
            java.math.BigDecimal newUnidadesRest = null;
            if (cont != null && cont.compareTo(java.math.BigDecimal.ZERO) > 0) {
                java.math.MathContext mc = java.math.MathContext.DECIMAL64;
                java.math.BigDecimal unidadesConsumidas = consumidoBase.divide(cont, mc);
                newUnidadesRest = cant.subtract(unidadesConsumidas);
                if (newUnidadesRest.compareTo(java.math.BigDecimal.ZERO) < 0) newUnidadesRest = java.math.BigDecimal.ZERO;
            }

            // Delta para ajustar consolidado
            java.math.BigDecimal delta = newStockBaseRest.subtract(oldStockBaseRest);

            // Aplicar cambios a la entrada
            e.setContenidoPorUnidad(cont);
            e.setCantidadUnidades(cant);
            e.setStockBaseRestante(newStockBaseRest);
            if (newUnidadesRest != null) e.setStockUnidadesRestantes(newUnidadesRest);
            e.setActivo(newStockBaseRest.compareTo(java.math.BigDecimal.ZERO) > 0);

            // Guardar entrada
            e = entradasRepo.save(e);

            // Ajustar inventario consolidado si hay delta
            if (delta.compareTo(java.math.BigDecimal.ZERO) != 0) {
                MovimientoInventarioProducto.TipoMovimiento tipo = delta.compareTo(java.math.BigDecimal.ZERO) > 0
                    ? MovimientoInventarioProducto.TipoMovimiento.ENTRADA
                    : MovimientoInventarioProducto.TipoMovimiento.AJUSTE;
                inventarioProductoService.registrarMovimiento(
                    e.getProduct().getId(),
                    tipo,
                    delta.abs(),
                    null,
                    null,
                    "Sistema",
                    "Ajuste por edición de entrada ID=" + e.getId()
                );
            }
            return e;
        }

        return entradasRepo.save(e);
    }

    @Transactional
    public InventarioEntradaProducto softDeleteEntrada(Long entradaId, String observacion) {
        InventarioEntradaProducto e = entradasRepo.findById(entradaId)
            .orElseThrow(() -> new RequestException("Entrada no encontrada: " + entradaId));
        e.setActivo(false);
        if (observacion != null && !observacion.isBlank()) {
            String prev = e.getObservaciones();
            e.setObservaciones((prev != null && !prev.isBlank()) ? prev + " | baja: " + observacion : "baja: " + observacion);
        }
        // Nota: No se ajusta inventario consolidado para conservar el último valor del producto
        return entradasRepo.save(e);
    }

    /**
     * Consumo FEFO por TIPO (TypeFood.id), recorriendo entradas válidas de todos los productos
     * del tipo en orden FEFO. Si respetarBandera=true, solo considera productos cuyo TypeFood.controlaStock=true
     * (o null con fallback por nombre no-noComestible)
     */
    @Transactional
    public Map<String, Object> consumirPorTipoFefo(Long tipoAlimentoId, BigDecimal cantidadBaseSolicitada,
                                                   String loteId, String usuario, String observaciones,
                                                   boolean respetarBandera) {
        return consumirPorTipoFefo(tipoAlimentoId, cantidadBaseSolicitada, loteId, usuario, observaciones, respetarBandera, null);
    }

    @Transactional
    public Map<String, Object> consumirPorTipoFefo(Long tipoAlimentoId, BigDecimal cantidadBaseSolicitada,
                                                   String loteId, String usuario, String observaciones,
                                                   boolean respetarBandera,
                                                   java.time.LocalDate fechaRegistro) {
        if (tipoAlimentoId == null) throw new RequestException("tipoAlimentoId requerido");
        if (cantidadBaseSolicitada == null || cantidadBaseSolicitada.compareTo(BigDecimal.ZERO) <= 0)
            throw new RequestException("cantidad debe ser > 0");

        List<Product> productos = productRepository.findByTypeFood_Id(tipoAlimentoId);
        if (productos == null || productos.isEmpty()) {
            Map<String, Object> r = new HashMap<>();
            r.put("success", false);
            r.put("cantidadConsumida", BigDecimal.ZERO);
            r.put("cantidadPendiente", cantidadBaseSolicitada);
            r.put("detalles", List.of());
            return r;
        }

        // Filtrar por controlaStock si aplica
        if (respetarBandera) {
            List<Product> filtrados = new ArrayList<>();
            for (Product p : productos) {
                if (controlaStock(p)) filtrados.add(p);
            }
            productos = filtrados;
            if (productos.isEmpty()) {
                Map<String, Object> r = new HashMap<>();
                r.put("success", false);
                r.put("cantidadConsumida", BigDecimal.ZERO);
                r.put("cantidadPendiente", cantidadBaseSolicitada);
                r.put("detalles", List.of());
                return r;
            }
        }

        // Recolectar todas las entradas válidas por producto
        class Item { InventarioEntradaProducto e; Long productId; }
        List<Item> expiradas = new ArrayList<>();
        List<Item> validas = new ArrayList<>();
        LocalDate hoy = LocalDate.now();
        for (Product p : productos) {
            List<InventarioEntradaProducto> entradas = entradasRepo.findActivasPorProducto(p.getId());
            for (InventarioEntradaProducto e : entradas) {
                if (e.getStockBaseRestante() == null || e.getStockBaseRestante().compareTo(BigDecimal.ZERO) <= 0) continue;
                Item it = new Item(); it.e = e; it.productId = p.getId();
                if (e.getFechaVencimiento() != null && e.getFechaVencimiento().isBefore(hoy)) expiradas.add(it);
                else validas.add(it);
            }
        }

        // Orden FEFO global: fechaVenc asc (nulos al final), luego ingreso
        validas.sort(Comparator
            .comparing((Item it) -> it.e.getFechaVencimiento(), Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(it -> it.e.getFechaIngreso(), Comparator.nullsLast(Comparator.naturalOrder()))
        );

        BigDecimal restante = cantidadBaseSolicitada;
        BigDecimal consumido = BigDecimal.ZERO;
        List<Map<String, Object>> detalles = new ArrayList<>();
        // Acumulado por producto para crear 1 movimiento por producto
        Map<Long, BigDecimal> consumoPorProducto = new HashMap<>();
        List<Item> tocadas = new ArrayList<>();

        for (Item it : validas) {
            if (restante.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal disp = it.e.getStockBaseRestante();
            if (disp == null || disp.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal aTomar = disp.min(restante);
            if (aTomar.compareTo(BigDecimal.ZERO) <= 0) continue;

            it.e.setStockBaseRestante(disp.subtract(aTomar));
            if (it.e.getContenidoPorUnidad() != null && it.e.getContenidoPorUnidad().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal unidadesConsumidas = aTomar.divide(it.e.getContenidoPorUnidad(), java.math.MathContext.DECIMAL64);
                BigDecimal unidadesRestantes = (it.e.getStockUnidadesRestantes() != null ? it.e.getStockUnidadesRestantes() : BigDecimal.ZERO)
                    .subtract(unidadesConsumidas);
                it.e.setStockUnidadesRestantes(unidadesRestantes.max(BigDecimal.ZERO));
            }
            if (it.e.getStockBaseRestante().compareTo(BigDecimal.ZERO) == 0) it.e.setActivo(false);
            entradasRepo.save(it.e);
            tocadas.add(it);

            detalles.add(Map.of(
                "productId", it.productId,
                "entradaId", it.e.getId(),
                "codigoLote", it.e.getCodigoLote(),
                "fechaVencimiento", it.e.getFechaVencimiento(),
                "consumido", aTomar,
                "stockBaseRestante", it.e.getStockBaseRestante()
            ));

            consumido = consumido.add(aTomar);
            restante = restante.subtract(aTomar);
            consumoPorProducto.put(it.productId, consumoPorProducto.getOrDefault(it.productId, BigDecimal.ZERO).add(aTomar));
        }

        boolean bloqueo = false;
        if (consumido.compareTo(BigDecimal.ZERO) == 0 && !expiradas.isEmpty()) bloqueo = true;

        // Registrar movimientos por producto y detalle por entrada
        Map<Long, MovimientoInventarioProducto> movPorProducto = new HashMap<>();
        for (Map.Entry<Long, BigDecimal> kv : consumoPorProducto.entrySet()) {
            // Usar la hora actual para que coincida con createDate del PlanEjecucion
            java.time.LocalDateTime fechaMov = java.time.LocalDateTime.now();
            if (fechaRegistro != null && !fechaRegistro.equals(java.time.LocalDate.now())) {
                // Solo usar hora diferente si la fecha es diferente al día actual
                fechaMov = fechaRegistro.atTime(java.time.LocalTime.now());
            }
            MovimientoInventarioProducto m = inventarioProductoService.registrarMovimientoConFecha(
                kv.getKey(), MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE, kv.getValue(), null, loteId,
                usuario != null ? usuario : "Sistema",
                observaciones != null ? observaciones : "Consumo FEFO por tipo",
                fechaMov
            );
            movPorProducto.put(kv.getKey(), m);
        }
        for (Map<String, Object> d : detalles) {
            Long pid = (Long) d.get("productId");
            MovimientoInventarioProducto m = movPorProducto.get(pid);
            if (m == null) continue;
            InventarioEntradaProducto e = entradasRepo.findById((Long) d.get("entradaId")).orElse(null);
            if (e == null) continue;
            BigDecimal cant = (BigDecimal) d.get("consumido");
            ConsumoEntradaProducto ce = ConsumoEntradaProducto.builder()
                .movimiento(m)
                .entrada(e)
                .cantidadBaseConsumida(cant)
                .cantidadUnidadesConsumidas(e.getContenidoPorUnidad() != null && e.getContenidoPorUnidad().compareTo(BigDecimal.ZERO) > 0
                    ? cant.divide(e.getContenidoPorUnidad(), java.math.MathContext.DECIMAL64) : null)
                .observaciones(observaciones)
                .build();
            consumoRepo.save(ce);
        }

        Map<String, Object> r = new HashMap<>();
        r.put("success", consumido.compareTo(BigDecimal.ZERO) > 0);
        r.put("cantidadConsumida", consumido);
        r.put("cantidadPendiente", restante.max(BigDecimal.ZERO));
        r.put("bloqueoPorVencido", bloqueo);
        r.put("detalles", detalles);
        return r;
    }

    // ============================
    // Helpers
    // ============================
    private boolean controlaStock(Product p) {
        try {
            TypeFood tf = p.getTypeFood();
            if (tf == null) return true;
            Boolean flag = tf.getControlaStock();
            if (flag != null) return flag;
            String name = tf.getName();
            if (name == null) return true;
            return !esTipoNoComestible(name.toLowerCase());
        } catch (Exception e) {
            return true;
        }
    }

    private boolean esTipoNoComestible(String n) {
        if (n == null) return false;
        return n.contains("vacun") || n.contains("medic") || n.contains("antibi") || n.contains("antiparasit") || n.contains("desparasit") || n.contains("antisept") || n.contains("antisépt") || n.contains("desinfect");
    }
}
