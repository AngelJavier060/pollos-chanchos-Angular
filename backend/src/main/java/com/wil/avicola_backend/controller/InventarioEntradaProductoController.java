package com.wil.avicola_backend.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import com.wil.avicola_backend.model.InventarioEntradaProducto;
import com.wil.avicola_backend.service.InventarioEntradaProductoService;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventario-entradas")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class InventarioEntradaProductoController {

    private final InventarioEntradaProductoService entradasService;

    // ============================
    // Crear entrada
    // ============================
    @PostMapping
    public ResponseEntity<?> crearEntrada(@RequestBody CrearEntradaRequest req) {
        try {
            if (req.getProductId() == null) return ResponseEntity.badRequest().body(Map.of("error", "productId requerido"));
            if (req.getContenidoPorUnidadBase() == null || req.getContenidoPorUnidadBase().compareTo(BigDecimal.ZERO) <= 0)
                return ResponseEntity.badRequest().body(Map.of("error", "contenidoPorUnidadBase debe ser > 0"));
            if (req.getCantidadUnidades() == null || req.getCantidadUnidades().compareTo(BigDecimal.ZERO) <= 0)
                return ResponseEntity.badRequest().body(Map.of("error", "cantidadUnidades debe ser > 0"));

            LocalDateTime fechaIngreso = req.getFechaIngreso() != null ? parseFechaHora(req.getFechaIngreso()) : LocalDateTime.now();
            LocalDate fechaVenc = req.getFechaVencimiento() != null ? parseFecha(req.getFechaVencimiento()) : null;

            InventarioEntradaProducto e = entradasService.registrarEntrada(
                req.getProductId(),
                req.getCodigoLote(),
                fechaIngreso,
                fechaVenc,
                req.getUnidadControl(),
                req.getContenidoPorUnidadBase(),
                req.getCantidadUnidades(),
                req.getObservaciones(),
                req.getProviderId(),
                req.getCostoUnitarioBase(),
                req.getCostoPorUnidadControl()
            );
            return ResponseEntity.ok(e);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", ex.getMessage()
            ));
        }
    }

    // ============================
    // Listar entradas por producto (activas)
    // ============================
    @GetMapping
    public ResponseEntity<?> listar(@RequestParam(required = false) Long productId) {
        if (productId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe proporcionar productId"));
        }
        List<InventarioEntradaProducto> lista = entradasService.listarActivasPorProducto(productId);
        return ResponseEntity.ok(lista);
    }

    // ============================
    // Vencidas (global o por producto si se pasa productId)
    // ============================
    @GetMapping("/vencidas")
    public ResponseEntity<?> vencidas(@RequestParam(required = false) Long productId) {
        if (productId != null) {
            return ResponseEntity.ok(entradasService.listarVencidasPorProducto(productId));
        }
        return ResponseEntity.ok(entradasService.listarVencidasGlobal());
    }

    // ============================
    // Por vencer (global o por producto) - dias por defecto 15
    // ============================
    @GetMapping("/por-vencer")
    public ResponseEntity<?> porVencer(@RequestParam(required = false) Long productId,
                                       @RequestParam(required = false, defaultValue = "15") int dias) {
        if (productId != null) {
            return ResponseEntity.ok(entradasService.listarPorVencerPorProducto(productId, dias));
        }
        return ResponseEntity.ok(entradasService.listarPorVencerGlobal(dias));
    }

    // ============================
    // Agregaciones
    // ============================
    @GetMapping("/stock-valido")
    public ResponseEntity<?> stockValidoAgrupado() {
        return ResponseEntity.ok(entradasService.obtenerStockValidoAgrupado());
    }

    // ============================
    // Actualizar metadata de una entrada (sin tocar cantidades)
    // ============================
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable("id") Long id, @RequestBody ActualizarEntradaRequest req) {
        try {
            java.time.LocalDateTime fi = req.getFechaIngreso() != null ? parseFechaHora(req.getFechaIngreso()) : null;
            java.time.LocalDate fv = req.getFechaVencimiento() != null ? parseFecha(req.getFechaVencimiento()) : null;
            InventarioEntradaProducto e = entradasService.actualizarEntradaMetadata(
                id,
                req.getCodigoLote(),
                fi,
                fv,
                req.getUnidadControl(),
                req.getObservaciones(),
                req.getProviderId(),
                req.getCostoUnitarioBase(),
                req.getCostoPorUnidadControl(),
                req.getContenidoPorUnidadBase(),
                req.getCantidadUnidades()
            );
            return ResponseEntity.ok(e);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    // ============================
    // Eliminar (soft delete) una entrada
    // ============================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable("id") Long id,
                                      @RequestParam(required = false) String observacion) {
        try {
            InventarioEntradaProducto e = entradasService.softDeleteEntrada(id, observacion);
            return ResponseEntity.ok(e);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    // ============================
    // Parsers de fecha
    // ============================
    private LocalDate parseFecha(String s) {
        // soporta ISO yyyy-MM-dd
        return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
    }
    private LocalDateTime parseFechaHora(String s) {
        // Aceptar múltiples formatos: ISO_INSTANT (con 'Z'), ISO_OFFSET_DATE_TIME, ISO_LOCAL_DATE_TIME, y fecha sola
        try {
            Instant inst = Instant.parse(s); // ej: 2025-11-07T00:00:00.000Z
            return LocalDateTime.ofInstant(inst, ZoneId.systemDefault());
        } catch (Exception ignore) {}
        try {
            OffsetDateTime odt = OffsetDateTime.parse(s, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            return odt.toLocalDateTime();
        } catch (Exception ignore) {}
        try {
            return LocalDateTime.parse(s, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            // fallback: solo fecha -> 00:00:00
            LocalDate f = LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
            return f.atStartOfDay();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CrearEntradaRequest {
        private Long productId;
        private String codigoLote;
        private String fechaIngreso;        // ISO (opcional)
        private String fechaVencimiento;    // ISO (opcional)
        private String unidadControl;       // frasco/saco/sobre/unidad
        private BigDecimal contenidoPorUnidadBase; // en unidad base (kg/g/ml)
        private BigDecimal cantidadUnidades;
        private String observaciones;
        private Long providerId;            // proveedor opcional
        private BigDecimal costoUnitarioBase;      // costo por unidad base
        private BigDecimal costoPorUnidadControl;  // costo por unidad de control
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActualizarEntradaRequest {
        private String codigoLote;
        private String fechaIngreso;        // ISO opcional
        private String fechaVencimiento;    // ISO opcional
        private String unidadControl;
        private String observaciones;
        private Long providerId;
        private BigDecimal costoUnitarioBase;
        private BigDecimal costoPorUnidadControl;
        private BigDecimal contenidoPorUnidadBase; // en unidad base (kg/g/ml)
        private BigDecimal cantidadUnidades;       // unidades de control
    }
}
