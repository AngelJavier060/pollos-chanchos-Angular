package com.wil.avicola_backend.controller;

import java.security.Principal;
import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.dto.ConsumoManualRequestDto;
import com.wil.avicola_backend.model.ConsumoManual;
import com.wil.avicola_backend.service.ConsumoManualService;

@RestController
@RequestMapping("/api/consumos/manual")
@CrossOrigin(origins = "http://localhost:4200")
public class ConsumoManualController {

    @Autowired
    private ConsumoManualService consumoManualService;

    @PostMapping
    public ResponseEntity<ConsumoManual> registrar(@RequestBody ConsumoManualRequestDto body, Principal principal) {
        String usuario = principal != null ? principal.getName() : "API";
        return consumoManualService.registrarConsumoManual(body, usuario);
    }

    @GetMapping
    public ResponseEntity<java.util.List<ConsumoManual>> listar(
            @RequestParam String loteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return consumoManualService.listarConsumos(loteId, inicio, fin);
    }
}
