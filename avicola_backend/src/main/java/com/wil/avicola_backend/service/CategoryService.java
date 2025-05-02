package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Category;
import com.wil.avicola_backend.repository.CategoryRepository;
import com.wil.avicola_backend.repository.ProductRepository;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private ProductRepository productRepository;

    public ResponseEntity<?> findCategories() {
        return ResponseEntity.ok().body(categoryRepository.findAll());
    }

    public ResponseEntity<Category> saveCategory(Category category) {

        if (categoryRepository.existsByName(category.getName())) {
            throw new RequestException("Ya existe categoría con el mismo nombre.");
        }

        Category category_new = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.OK).body(category_new);
    }

    public ResponseEntity<Category> updateCategory(Category category) {

        if (categoryRepository.existsById(category.getId())) {
            if (categoryRepository.existsByNameOther(category.getId(), category.getName())) {
                throw new RequestException("Ya existe categoría con el mismo nombre.");
            }

            Category category_old = categoryRepository.findById(category.getId()).get();
            category_old.setName(category.getName());
            categoryRepository.save(category_old);
            return ResponseEntity.status(HttpStatus.OK).body(category_old);
        }
        throw new RequestException("No existe categoría.");
    }

    public ResponseEntity<Category> deleteCategory(long id) {

        // Si esta relacionado con producto
        if (productRepository.existsByCategory(id)) {
            throw new RequestException(
                    "No puede ser eliminado, existe product(s) registrados con la categoría.");
        }

        if (categoryRepository.existsById(id)) {
            Category category = categoryRepository.findById(id).get();
            categoryRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(category);
        }

        throw new RequestException("No existe categoría.");
    }
}
