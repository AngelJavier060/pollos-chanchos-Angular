package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.RaceRepository;

@Service
public class AnimalService {

    @Autowired
    private AnimalRepository animalRepository;
    @Autowired
    private RaceRepository raceRepository;

    public ResponseEntity<?> findAnimals() {
        return ResponseEntity.ok().body(animalRepository.findAll());
    }

    public ResponseEntity<Animal> saveAnimal(Animal animal) {

        if (animalRepository.existsByName(animal.getName())) {
            throw new RequestException("Ya existe animal con el mismo nombre.");
        }
        Animal animal_new = animalRepository.save(animal);
        return ResponseEntity.status(HttpStatus.OK).body(animal_new);
    }

    public ResponseEntity<Animal> updateAnimal(Animal animal) {

        if (animalRepository.existsById(animal.getId())) {
            if (animalRepository.existsByNameOther(animal.getId(), animal.getName())) {
                throw new RequestException("Ya existe animal con el mismo nombre.");
            }

            Animal animal_old = animalRepository.findById(animal.getId()).get();
            animal_old.setName(animal.getName());
            animalRepository.save(animal_old);
            return ResponseEntity.status(HttpStatus.OK).body(animal_old);
        }
        throw new RequestException("No existe animal.");
    }

    public ResponseEntity<Animal> deleteAnimal(long id) {

        // Si esta relacionado con raza
        if (raceRepository.existsByAnimal(id)) {
            throw new RequestException("No puede ser eliminado, existe raza(s) registrados con el animal.");
        }

        if (animalRepository.existsById(id)) {
            Animal animal = animalRepository.findById(id).get();
            animalRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(animal);
        }

        throw new RequestException("No existe animal.");
    }
}
