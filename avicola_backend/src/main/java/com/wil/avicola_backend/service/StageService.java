package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Stage;
import com.wil.avicola_backend.repository.StageRepository;

@Service
public class StageService {

    @Autowired
    private StageRepository stageRepository;

    public ResponseEntity<?> findStages() {
        return ResponseEntity.ok().body(stageRepository.findAll());
    }

    public ResponseEntity<Stage> saveStage(Stage stage) {
        if (stageRepository.existsByName(stage.getName())) {
            throw new RequestException("Ya existe una etapa con el mismo nombre.");
        }

        Stage stage_new = stageRepository.save(stage);
        return ResponseEntity.status(HttpStatus.OK).body(stage_new);
    }

    public ResponseEntity<Stage> updateStage(Stage stage) {
        if (stageRepository.existsById(stage.getId())) {
            if (stageRepository.existsByNameOther(stage.getId(), stage.getName())) {
                throw new RequestException("Ya existe una etapa con el mismo nombre.");
            }

            Stage stage_old = stageRepository.findById(stage.getId()).get();
            stage_old.setName(stage.getName());
            stage_old.setDescription(stage.getDescription());
            stageRepository.save(stage_old);
            return ResponseEntity.status(HttpStatus.OK).body(stage_old);
        }
        throw new RequestException("No existe la etapa.");
    }

    public ResponseEntity<Stage> deleteStage(long id) {
        if (stageRepository.existsById(id)) {
            Stage stage = stageRepository.findById(id).get();
            stageRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(stage);
        }

        throw new RequestException("No existe la etapa.");
    }
}