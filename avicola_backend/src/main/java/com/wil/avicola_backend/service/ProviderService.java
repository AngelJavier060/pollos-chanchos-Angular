package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Provider;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.ProviderRepository;

@Service
public class ProviderService {

    @Autowired
    private ProviderRepository providerRepository;
    @Autowired
    private ProductRepository productRepository;

    public ResponseEntity<?> findProviders() {
        return ResponseEntity.ok().body(providerRepository.findAll());
    }

    public ResponseEntity<Provider> saveProvider(Provider provider) {

        if (providerRepository.existsByName(provider.getName())) {
            throw new RequestException("Ya existe proveedor con el mismo nombre.");
        }

        Provider provider_new = providerRepository.save(provider);
        return ResponseEntity.status(HttpStatus.OK).body(provider_new);
    }

    public ResponseEntity<Provider> updateProvider(Provider provider) {

        if (providerRepository.existsById(provider.getId())) {
            if (providerRepository.existsByNameOther(provider.getId(), provider.getName())) {
                throw new RequestException("Ya existe proveedor con el mismo nombre.");
            }

            Provider provider_old = providerRepository.findById(provider.getId()).get();
            provider_old.setName(provider.getName());
            providerRepository.save(provider_old);
            return ResponseEntity.status(HttpStatus.OK).body(provider_old);
        }
        throw new RequestException("No existe proveedor.");
    }

    public ResponseEntity<Provider> deleteProvider(long id) {

        // Si esta relacionado con producto
        if (productRepository.existsByProvider(id)) {
            throw new RequestException("No puede ser eliminado, existe product(s) registrados con el proveedor.");
        }

        if (providerRepository.existsById(id)) {
            Provider provider = providerRepository.findById(id).get();
            providerRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(provider);
        }

        throw new RequestException("No existe proveedor.");
    }
}
