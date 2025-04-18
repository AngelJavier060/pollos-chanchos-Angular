package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;

@Service
public class TypeFoodService {

    @Autowired
    private TypeFoodRepository typeFoodRepository;
    @Autowired
    private ProductRepository productRepository;

    public ResponseEntity<?> findTypeFoods() {
        return ResponseEntity.ok().body(typeFoodRepository.findAll());
    }

    public ResponseEntity<TypeFood> saveTypeFood(TypeFood typeFood) {

        if (typeFoodRepository.existsByName(typeFood.getName())) {
            throw new RequestException("Ya existe tipo de alimento con el mismo nombre.");
        }

        TypeFood typeFood_new = typeFoodRepository.save(typeFood);
        return ResponseEntity.status(HttpStatus.OK).body(typeFood_new);
    }

    public ResponseEntity<TypeFood> updateTypeFood(TypeFood typeFood) {

        if (typeFoodRepository.existsById(typeFood.getId())) {
            if (typeFoodRepository.existsByNameOther(typeFood.getId(), typeFood.getName())) {
                throw new RequestException("Ya existe tipo de alimento con el mismo nombre.");
            }

            TypeFood typeFood_old = typeFoodRepository.findById(typeFood.getId()).get();
            typeFood_old.setName(typeFood.getName());
            typeFoodRepository.save(typeFood_old);
            return ResponseEntity.status(HttpStatus.OK).body(typeFood_old);
        }
        throw new RequestException("No existe tipo de alimento.");
    }

    public ResponseEntity<TypeFood> deleteTypeFood(long id) {

        // Si esta relacionado con producto
        if (productRepository.existsByTypeFood(id)) {
            throw new RequestException(
                    "No puede ser eliminado, existe product(s) registrados con el tipo de alimento.");
        }

        if (typeFoodRepository.existsById(id)) {
            TypeFood typeFood = typeFoodRepository.findById(id).get();
            typeFoodRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(typeFood);
        }

        throw new RequestException("No existe tipo de alimento.");
    }
}
