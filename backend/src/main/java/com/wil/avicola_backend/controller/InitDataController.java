package com.wil.avicola_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.service.InitDataService;

/**
 * Controlador para inicializar datos de ejemplo en la base de datos
 * Solo para desarrollo y testing
 */
@RestController
@RequestMapping("/api/init-data")
public class InitDataController {
    
    @Autowired
    private InitDataService initDataService;
    
    /**
     * Verificar si existen datos básicos en el sistema
     */
    @GetMapping("/check")
    public ResponseEntity<Object> checkData() {
        return initDataService.checkExistingData();
    }
    
    /**
     * Inicializar datos de ejemplo (animales, productos, planes, lotes, etc.)
     */
    @PostMapping("/init-example-data")
    public ResponseEntity<Object> initExampleData() {
        return initDataService.initializeExampleData();
    }
    
    /**
     * Limpiar todos los datos (solo para desarrollo)
     */
    @PostMapping("/clear-all")
    public ResponseEntity<Object> clearAllData() {
        return initDataService.clearAllData();
    }
    
    /**
     * Endpoint completo: verificar y crear datos si no existen
     */
    @PostMapping("/setup")
    public ResponseEntity<Object> setupSystem() {
        return initDataService.setupSystem();
    }
    
    /**
     * Debug: Mostrar los datos actuales en la base de datos
     */
    @GetMapping("/debug")
    public ResponseEntity<Object> debugData() {
        return initDataService.debugCurrentData();
    }
}
