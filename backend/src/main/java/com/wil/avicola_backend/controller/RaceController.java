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

import com.wil.avicola_backend.model.Race;
import com.wil.avicola_backend.service.RaceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/race")
public class RaceController {

    @Autowired
    private RaceService raceService;

    @GetMapping
    public ResponseEntity<?> finAllRace() {
        return raceService.findAllRace();
    }

    @PostMapping("/{id_animal}")
    public ResponseEntity<Race> saveRace(@PathVariable long id_animal, @Valid @RequestBody Race race) {
        return raceService.saveRace(id_animal, race);
    }

    @PutMapping
    public ResponseEntity<Race> updateRace(
            @Valid @RequestBody Race race) {
        return raceService.updateRace(race);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Race> deleteRace(@PathVariable long id) {
        return raceService.deleteRace(id);
    }
}