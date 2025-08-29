package com.wil.avicola_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.NombreProducto;
import com.wil.avicola_backend.repository.NombreProductoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NombreProductoService {

    private final NombreProductoRepository repository;

    @Transactional(readOnly = true)
    public List<NombreProducto> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<NombreProducto> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<NombreProducto> search(String term) {
        if (term == null || term.isBlank()) {
            return findAll();
        }
        return repository.searchByNombre(term);
    }

    @Transactional
    public NombreProducto create(NombreProducto np) {
        // Normalizar nombre y validar duplicado
        String nombre = np.getNombre() != null ? np.getNombre().trim() : "";
        if (nombre.isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        repository.findByNombreIgnoreCase(nombre).ifPresent(ex -> {
            throw new IllegalArgumentException("Ya existe un nombre de producto con ese nombre");
        });
        np.setNombre(nombre);
        return repository.save(np);
    }

    @Transactional
    public NombreProducto update(Long id, NombreProducto body) {
        NombreProducto actual = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No existe el registro"));

        String nombre = body.getNombre() != null ? body.getNombre().trim() : "";
        if (nombre.isEmpty()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }

        // Validar duplicado para otro ID
        repository.findByNombreIgnoreCase(nombre).ifPresent(ex -> {
            if (!ex.getId().equals(id)) {
                throw new IllegalArgumentException("Ya existe un nombre de producto con ese nombre");
            }
        });

        actual.setNombre(nombre);
        actual.setDescripcion(body.getDescripcion());
        return repository.save(actual);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("No existe el registro");
        }
        repository.deleteById(id);
    }
}
