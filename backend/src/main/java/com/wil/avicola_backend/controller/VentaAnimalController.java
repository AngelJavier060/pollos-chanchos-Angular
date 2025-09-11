package com.wil.avicola_backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.VentaAnimalDTO;
import com.wil.avicola_backend.model.VentaAnimal;
import com.wil.avicola_backend.service.VentaAnimalService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ventas/animales")
@RequiredArgsConstructor
public class VentaAnimalController {

    private final VentaAnimalService ventaAnimalService;

    @PostMapping
    public ResponseEntity<VentaAnimal> crear(@Valid @RequestBody VentaAnimalDTO body) {
        VentaAnimal saved = ventaAnimalService.crearVenta(body, null);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<VentaAnimal>> listar(
        @RequestParam(name = "from", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(name = "to", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ventaAnimalService.listarPorRango(from, to));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VentaAnimal> actualizar(@PathVariable Long id, @Valid @RequestBody VentaAnimalDTO body) {
        return ResponseEntity.ok(ventaAnimalService.actualizarVenta(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        ventaAnimalService.eliminarVenta(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/anular")
    public ResponseEntity<VentaAnimal> anular(@PathVariable Long id) {
        return ResponseEntity.ok(ventaAnimalService.anularVenta(id));
    }
}
