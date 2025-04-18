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

import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.service.TypeFoodService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/typefood")
public class TypeFoodController {

    @Autowired
    private TypeFoodService typeFoodService;

    @GetMapping
    public ResponseEntity<?> findTypeFoods() {
        return typeFoodService.findTypeFoods();
    }

    @PostMapping
    public ResponseEntity<TypeFood> saveTypeFood(@Valid @RequestBody TypeFood typeFood) {
        return typeFoodService.saveTypeFood(typeFood);
    }

    @PutMapping
    public ResponseEntity<TypeFood> updateTypeFood(
            @Valid @RequestBody TypeFood typeFood) {
        return typeFoodService.updateTypeFood(typeFood);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<TypeFood> deleteTypeFood(@PathVariable long id) {
        return typeFoodService.deleteTypeFood(id);
    }
}