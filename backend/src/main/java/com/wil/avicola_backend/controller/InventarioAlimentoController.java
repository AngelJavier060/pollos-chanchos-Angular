package com.wil.avicola_backend.controller;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.service.InventarioAlimentoService;

@RestController
@RequestMapping("/api/inventarios")
// @CrossOrigin(origins = "http://localhost:4200")
public class InventarioAlimentoController {

    @Autowired
    private InventarioAlimentoService inventarioAlimentoService;

    /**
     * Obtener stock actual por lista de productIds.
     * Ejemplo: GET /api/inventarios/stock?productIds=1,2,3
     */
    @GetMapping
    public ResponseEntity<?> findInventarios() {
        return inventarioAlimentoService.findInventarios();
    }
    @GetMapping("/stock")
    public ResponseEntity<Map<Long, BigDecimal>> getStockPorProductos(
            @RequestParam(name = "productIds") String productIdsStr) {
        if (productIdsStr == null || productIdsStr.trim().isEmpty()) {
            return ResponseEntity.ok(Map.of());
        }
        List<Long> ids = Arrays.stream(productIdsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());

        Map<Long, BigDecimal> stockMap = inventarioAlimentoService.getStockPorProductos(ids);
        return ResponseEntity.ok(stockMap);
    }
}
