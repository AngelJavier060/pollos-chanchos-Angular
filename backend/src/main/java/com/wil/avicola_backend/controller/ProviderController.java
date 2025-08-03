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

import com.wil.avicola_backend.model.Provider;
import com.wil.avicola_backend.service.ProviderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/provider")
public class ProviderController {

    @Autowired
    private ProviderService providerService;

    @GetMapping
    public ResponseEntity<?> findProviders() {
        return providerService.findProviders();
    }

    @PostMapping
    public ResponseEntity<Provider> saveProvider(@Valid @RequestBody Provider provider) {
        return providerService.saveProvider(provider);
    }

    @PutMapping
    public ResponseEntity<Provider> updateProvider(
            @Valid @RequestBody Provider provider) {
        return providerService.updateProvider(provider);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Provider> deleteProvider(@PathVariable long id) {
        return providerService.deleteProvider(id);
    }
}