package com.wil.avicola_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.service.LoteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/lote")
public class LoteController {

    @Autowired
    private LoteService loteService;

    @GetMapping
    public ResponseEntity<?> findLotes() {
        return loteService.findLotes();
    }
    
    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<Lote> findByCodigo(@PathVariable String codigo) {
        return loteService.findByCodigo(codigo);
    }
    
    @GetMapping("/check-duplicate")
    public ResponseEntity<Boolean> checkDuplicateName(@RequestParam String name, @RequestParam long animalId) {
        boolean exists = loteService.existsByNameAndAnimalId(name, animalId);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/{id_race}")
    public ResponseEntity<Lote> saveLote(@PathVariable long id_race, @Valid @RequestBody Lote lote) {
        return loteService.saveLote(id_race, lote);
    }
    
    @PostMapping("/nuevo")
    public ResponseEntity<Lote> crearNuevoLote(@Valid @RequestBody Lote lote) {
        if (lote.getRace() == null || lote.getRace().getId() == 0) {
            throw new com.wil.avicola_backend.error.RequestException("Se requiere una raza válida");
        }
        
        long raceId = lote.getRace().getId();
        return loteService.saveLote(raceId, lote);
    }

    @PutMapping
    public ResponseEntity<Lote> updateLote(
            @Valid @RequestBody Lote lote) {
        return loteService.updateLote(lote);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Lote> deleteLote(@PathVariable String id) {
        return loteService.deleteLote(id);
    }
}