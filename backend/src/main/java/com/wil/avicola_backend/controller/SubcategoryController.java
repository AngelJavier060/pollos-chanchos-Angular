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

import com.wil.avicola_backend.model.Subcategory;
import com.wil.avicola_backend.service.SubcategoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/subcategory")
public class SubcategoryController {

    @Autowired
    private SubcategoryService subcategoryService;

    @GetMapping
    public ResponseEntity<?> findAll() {
        return subcategoryService.findAll();
    }

    @GetMapping("/by-category/{categoryId}")
    public ResponseEntity<?> findByCategory(@PathVariable Long categoryId) {
        return subcategoryService.findByCategory(categoryId);
    }

    @GetMapping("/grouped")
    public ResponseEntity<?> grouped() {
        return subcategoryService.groupedByCategory();
    }

    @PostMapping
    public ResponseEntity<Subcategory> create(@Valid @RequestBody Subcategory s) {
        return subcategoryService.create(s);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subcategory> update(@PathVariable Long id, @Valid @RequestBody Subcategory s) {
        return subcategoryService.update(id, s);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return subcategoryService.delete(id);
    }
}
