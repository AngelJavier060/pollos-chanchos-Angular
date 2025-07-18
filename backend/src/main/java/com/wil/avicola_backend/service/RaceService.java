package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Race;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.RaceRepository;

@Service
public class RaceService {

    @Autowired
    private RaceRepository raceRepository;
    @Autowired
    private LoteRepository loteRepository;
    @Autowired
    private AnimalRepository animalRepository;

    public ResponseEntity<?> findAllRace() {
        return ResponseEntity.ok().body(raceRepository.findAll());
    }

    public ResponseEntity<Race> saveRace(long id_animal, Race race) {

        if (!animalRepository.existsById(id_animal)) {
            throw new RequestException("No existe animal.");
        }

        if (raceRepository.existsByName(race.getName())) {
            throw new RequestException("Ya existe raza con el mismo nombre.");
        }

        race.setAnimal(animalRepository.findById(id_animal).get());
        Race race_new = raceRepository.save(race);

        return ResponseEntity.status(HttpStatus.OK).body(race_new);
    }

    public ResponseEntity<Race> updateRace(Race race) {

        if (raceRepository.existsById(race.getId())) {
            if (raceRepository.existsByNameOther(race.getId(), race.getName())) {
                throw new RequestException("Ya existe raza con el mismo nombre.");
            }

            Race race_old = raceRepository.findById(race.getId()).get();
            race_old.setName(race.getName());
            raceRepository.save(race_old);
            return ResponseEntity.status(HttpStatus.OK).body(race_old);
        }
        throw new RequestException("No existe raza.");
    }

    public ResponseEntity<Race> deleteRace(long id) {

        // Si esta relacionado con lote
        if (loteRepository.existsByRace(id)) {
            throw new RequestException("No puede ser eliminado, existe lote(s) registrado con la raza.");
        }

        if (raceRepository.existsById(id)) {
            Race race = raceRepository.findById(id).get();
            raceRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(race);
        }

        throw new RequestException("No existe raza.");
    }
}
