package com.wil.avicola_backend.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.model.InventarioProducto;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;
import com.wil.avicola_backend.service.InventarioProductoService;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventario-producto")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class InventarioProductoController {

    private final InventarioProductoService inventarioProductoService;

    @GetMapping
    public ResponseEntity<List<InventarioProducto>> listar() {
        return ResponseEntity.ok(inventarioProductoService.listar());
    }

    @GetMapping("/producto/{productId}")
    public ResponseEntity<InventarioProducto> porProducto(@PathVariable Long productId) {
        InventarioProducto inv = inventarioProductoService.porProducto(productId);
        return inv != null ? ResponseEntity.ok(inv) : ResponseEntity.notFound().build();
    }

    @PostMapping("/movimientos")
    public ResponseEntity<MovimientoInventarioProducto> registrarMovimiento(@RequestBody MovimientoRequest req) {
        MovimientoInventarioProducto mov = inventarioProductoService.registrarMovimiento(
            req.getProductId(),
            req.getTipo(),
            req.getCantidad(),
            req.getCostoUnitario(),
            req.getLoteId(),
            req.getUsuario(),
            req.getObservaciones()
        );
        return ResponseEntity.ok(mov);
    }

    // ==========================================================
    // Nuevos endpoints de soporte
    // ==========================================================

    @GetMapping("/movimientos/{productId}")
    public ResponseEntity<List<MovimientoInventarioProducto>> movimientosPorProducto(@PathVariable Long productId) {
        return ResponseEntity.ok(inventarioProductoService.obtenerMovimientosPorProducto(productId));
    }

    // Agregado: disminución agrupada (SALIDA + CONSUMO_LOTE) por producto
    @GetMapping("/disminucion")
    public ResponseEntity<java.util.Map<Long, java.math.BigDecimal>> disminucionAgrupada() {
        return ResponseEntity.ok(inventarioProductoService.sumDisminucionPorProducto());
    }

    // ==========================================================
    // Sincronización masiva: crear inventarios faltantes y entradas iniciales
    // ==========================================================
    @PostMapping("/sincronizar")
    public ResponseEntity<Map<String, Object>> sincronizar(@RequestParam(name = "soloAlimentos", defaultValue = "true") boolean soloAlimentos) {
        Map<String, Object> resumen = inventarioProductoService.sincronizarTodos(soloAlimentos);
        return ResponseEntity.ok(resumen);
    }

    @PostMapping("/backfill")
    public ResponseEntity<Map<String, Object>> backfill(@RequestParam(name = "soloAlimentos", defaultValue = "true") boolean soloAlimentos) {
        Map<String, Object> resumen = inventarioProductoService.backfillEntradas(soloAlimentos);
        return ResponseEntity.ok(resumen);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovimientoRequest {
        private Long productId;
        private MovimientoInventarioProducto.TipoMovimiento tipo;
        private BigDecimal cantidad;
        private BigDecimal costoUnitario;
        private String loteId;
        private String usuario;
        private String observaciones;
    }
}
