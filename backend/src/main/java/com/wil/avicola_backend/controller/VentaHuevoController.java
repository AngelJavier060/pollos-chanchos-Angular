package com.wil.avicola_backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.VentaHuevoDTO;
import com.wil.avicola_backend.model.VentaHuevo;
import com.wil.avicola_backend.service.VentaHuevoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ventas/huevos")
@RequiredArgsConstructor
public class VentaHuevoController {

    private final VentaHuevoService ventaHuevoService;

    @PostMapping
    public ResponseEntity<VentaHuevo> crear(@Valid @RequestBody VentaHuevoDTO body) {
        // En esta primera versión no vinculamos vendedor por seguridad/JWT aún
        VentaHuevo saved = ventaHuevoService.crearVenta(body, null);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<VentaHuevo>> listar(
        @RequestParam(name = "from", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(name = "to", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ventaHuevoService.listarPorRango(from, to));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VentaHuevo> actualizar(@PathVariable Long id, @Valid @RequestBody VentaHuevoDTO body) {
        VentaHuevo updated = ventaHuevoService.actualizarVenta(id, body);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        ventaHuevoService.eliminarVenta(id);
        return ResponseEntity.noContent().build();
    }
}
