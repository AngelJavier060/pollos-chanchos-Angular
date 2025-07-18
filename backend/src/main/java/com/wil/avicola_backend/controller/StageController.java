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

import com.wil.avicola_backend.model.Stage;
import com.wil.avicola_backend.service.StageService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/stage")
public class StageController {

    @Autowired
    private StageService stageService;

    @GetMapping
    public ResponseEntity<?> findStages() {
        return stageService.findStages();
    }

    @PostMapping
    public ResponseEntity<Stage> saveStage(@Valid @RequestBody Stage stage) {
        return stageService.saveStage(stage);
    }

    @PutMapping
    public ResponseEntity<Stage> updateStage(
            @Valid @RequestBody Stage stage) {
        return stageService.updateStage(stage);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Stage> deleteStage(@PathVariable long id) {
        return stageService.deleteStage(id);
    }
}