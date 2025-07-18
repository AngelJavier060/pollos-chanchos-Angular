package com.wil.avicola_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*")
public class HealthCheckController {
    private static final Logger logger = LoggerFactory.getLogger(HealthCheckController.class);

    // Este endpoint debe ser público y no requerir autenticación
    @GetMapping({"/health", "/api/health", "/api/health-check"})
    @CrossOrigin(origins = "http://localhost:4200", 
                 allowedHeaders = {"Authorization", "Content-Type", "Cache-Control"},
                 exposedHeaders = {"Authorization"})
    public ResponseEntity<Map<String, Object>> healthCheck() {
        logger.debug("Verificación de salud solicitada");
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("service", "avicola-backend");
        response.put("auth", true);
        response.put("db", true);
        response.put("storage", true);
          return ResponseEntity.ok().body(response);
    }
}
