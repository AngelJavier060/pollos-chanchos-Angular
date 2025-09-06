package com.wil.avicola_backend.controller;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.repository.VentaHuevoRepository;
import com.wil.avicola_backend.repository.VentaAnimalRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthDebugController {

    private final DataSource dataSource;
    private final VentaHuevoRepository ventaHuevoRepository;
    private final VentaAnimalRepository ventaAnimalRepository;

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> dbInfo() throws SQLException {
        Map<String, Object> info = new HashMap<>();
        try (Connection c = dataSource.getConnection()) {
            DatabaseMetaData md = c.getMetaData();
            info.put("url", md.getURL());
            info.put("user", md.getUserName());
            info.put("dbProduct", md.getDatabaseProductName());
            info.put("dbVersion", md.getDatabaseProductVersion());
            info.put("schema", c.getSchema());
        }
        info.put("venta_huevo_count", ventaHuevoRepository.count());
        info.put("venta_animal_count", ventaAnimalRepository.count());
        return ResponseEntity.ok(info);
    }
}
