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

import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.service.AnimalService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/animal")
public class AnimalController {

    @Autowired
    private AnimalService animalService;

    @GetMapping
    public ResponseEntity<?> findAnimals() {
        return animalService.findAnimals();
    }

    @PostMapping
    public ResponseEntity<Animal> saveAnimal(@Valid @RequestBody Animal animal) {
        return animalService.saveAnimal(animal);
    }

    @PutMapping
    public ResponseEntity<Animal> updateAnimal(@Valid @RequestBody Animal animal) {
        return animalService.updateAnimal(animal);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Animal> deleteAnimal(@PathVariable long id) {
        return animalService.deleteAnimal(id);
    }
}