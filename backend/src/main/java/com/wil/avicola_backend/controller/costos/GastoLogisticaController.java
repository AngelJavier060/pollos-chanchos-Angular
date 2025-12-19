package com.wil.avicola_backend.controller.costos;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.costos.GastoLogisticaDTO;
import com.wil.avicola_backend.model.costos.GastoLogistica;
import com.wil.avicola_backend.service.costos.GastoLogisticaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/costos/logistica")
@RequiredArgsConstructor
public class GastoLogisticaController {

    private final GastoLogisticaService service;

    @PostMapping
    public ResponseEntity<GastoLogistica> crear(@Valid @RequestBody GastoLogisticaDTO body) {
        return ResponseEntity.ok(service.crear(body));
    }

    @GetMapping
    public ResponseEntity<List<GastoLogistica>> listar(
        @RequestParam(name = "desde", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
        @RequestParam(name = "hasta", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
        @RequestParam(name = "loteId", required = false) String loteId,
        @RequestParam(name = "loteCodigo", required = false) String loteCodigo
    ) {
        return ResponseEntity.ok(service.listar(desde, hasta, loteId, loteCodigo));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GastoLogistica> obtener(@PathVariable String id) {
        return ResponseEntity.ok(service.obtener(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GastoLogistica> actualizar(@PathVariable String id, @Valid @RequestBody GastoLogisticaDTO body) {
        return ResponseEntity.ok(service.actualizar(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/migrar-distribucion")
    public ResponseEntity<Map<String, Object>> migrarDistribucion() {
        int updated = service.migrarDistribucion();
        Map<String, Object> res = new HashMap<>();
        res.put("updated", updated);
        return ResponseEntity.ok(res);
    }
}
