package com.wil.avicola_backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Date;

/**
 * Controlador para diagnosticar el estado del backend (endpoints legacy)
 */
@RestController
public class HealthController {

    // Nota: El endpoint principal /health ahora está en HealthCheckController
    // Este controlador mantiene endpoints legacy para compatibilidad
    
    /**
     * Endpoint legacy para verificar que el servidor está en funcionamiento
     * @return Estado del servidor y metadatos
     */
    @GetMapping("/legacy-health")
    public ResponseEntity<Map<String, Object>> legacyHealthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", new Date().toString());
        response.put("server", "Avicola Backend API");
        response.put("version", "1.0.0");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint para verificar la autenticación
     * @return Estado de la autenticación
     */
    @GetMapping("/auth-check")
    public ResponseEntity<Map<String, Object>> authCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        response.put("timestamp", new Date().toString());
        
        return ResponseEntity.ok(response);
    }
}
