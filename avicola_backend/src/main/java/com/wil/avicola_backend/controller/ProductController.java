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

import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.service.ProductService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/product")
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public ResponseEntity<?> findProducts() {
        return productService.findProducts();
    }

    @PostMapping("/{id_provider}/{id_type_food}/{id_unit_measurement}/{id_animal}/{id_stage}/{id_category}")
    public ResponseEntity<Product> saveProduct(
            @PathVariable long id_provider,
            @PathVariable long id_type_food,
            @PathVariable long id_unit_measurement,
            @PathVariable long id_animal,
            @PathVariable long id_stage,
            @PathVariable long id_category,
            @Valid @RequestBody Product product) {
        return productService.saveProduct(id_provider, id_type_food, id_unit_measurement, id_animal, id_stage, id_category, product);
    }

    @PutMapping
    public ResponseEntity<Product> updateProduct(
            @Valid @RequestBody Product product) {
        return productService.updateProduct(product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Product> deleteProduct(@PathVariable long id) {
        return productService.deleteProduct(id);
    }
}