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
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.model.UnitMeasurement;
import com.wil.avicola_backend.service.UnitMeasurementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/unitmeasurement")
public class UnitMeasurementController {

    @Autowired
    private UnitMeasurementService unitMeasurementService;

    @GetMapping
    public ResponseEntity<?> findUnitMeasurements() {
        return unitMeasurementService.findUnitMeasurements();
    }

    @PostMapping
    public ResponseEntity<UnitMeasurement> saveUnitMeasurement(@Valid @RequestBody UnitMeasurement unitMeasurement) {
        return unitMeasurementService.saveUnitMeasurement(unitMeasurement);
    }

    @PutMapping
    public ResponseEntity<UnitMeasurement> updateUnitMeasurement(
            @Valid @RequestBody UnitMeasurement unitMeasurement) {
        return unitMeasurementService.updateUnitMeasurement(unitMeasurement);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<UnitMeasurement> deleteTypeFood(@PathVariable long id) {
        return unitMeasurementService.deleteUnitMeasurement(id);
    }
}