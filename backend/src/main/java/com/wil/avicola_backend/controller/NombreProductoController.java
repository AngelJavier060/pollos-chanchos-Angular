package com.wil.avicola_backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.model.NombreProducto;
import com.wil.avicola_backend.service.NombreProductoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/nombre-producto")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class NombreProductoController {

    private final NombreProductoService service;

    @GetMapping
    public ResponseEntity<List<NombreProducto>> getAll(@RequestParam(name = "q", required = false) String q) {
        if (q != null && !q.isBlank()) {
            return ResponseEntity.ok(service.search(q));
        }
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping
    public ResponseEntity<NombreProducto> create(@RequestBody NombreProducto body) {
        return ResponseEntity.ok(service.create(body));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NombreProducto> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<NombreProducto> update(@PathVariable Long id, @RequestBody NombreProducto body) {
        return ResponseEntity.ok(service.update(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
