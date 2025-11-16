package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Category;
import com.wil.avicola_backend.repository.CategoryRepository;
import com.wil.avicola_backend.repository.ProductRepository;

import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CategoryService {

    private static final Logger logger = LoggerFactory.getLogger(CategoryService.class);

    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private ProductRepository productRepository;

    /**
     * Inicializa el sistema con una categoría predeterminada si no existe ninguna
     */
    @PostConstruct
    public void init() {
        try {
            if (categoryRepository.count() == 0) {
                logger.info("No se encontraron categorías. Creando categoría predeterminada.");
                Category defaultCategory = new Category();
                defaultCategory.setName("General");
                categoryRepository.save(defaultCategory);
                logger.info("Categoría predeterminada creada con ID: {}", defaultCategory.getId());
            }
        } catch (Exception e) {
            logger.error("Error al crear categoría predeterminada: {}", e.getMessage(), e);
        }
    }

    /**
     * Encuentra una categoría para usar, garantizando que siempre haya una disponible
     * @return ID de una categoría válida
     */
    public Long findOrCreateDefaultCategory() {
        try {
            long count = categoryRepository.count();
            if (count == 0) {
                // Crear categoría predeterminada
                Category defaultCategory = new Category();
                defaultCategory.setName("General");
                Category saved = categoryRepository.save(defaultCategory);
                logger.info("Se creó una nueva categoría predeterminada con ID: {}", saved.getId());
                return saved.getId();
            } else {
                // Obtener la primera categoría disponible
                List<Category> categories = categoryRepository.findAll();
                if (!categories.isEmpty()) {
                    logger.info("Usando categoría existente con ID: {}", categories.get(0).getId());
                    return categories.get(0).getId();
                } else {
                    // Este caso no debería ocurrir, pero por si acaso
                    Category defaultCategory = new Category();
                    defaultCategory.setName("General");
                    Category saved = categoryRepository.save(defaultCategory);
                    logger.info("Se creó una categoría de emergencia con ID: {}", saved.getId());
                    return saved.getId();
                }
            }
        } catch (Exception e) {
            logger.error("Error al obtener/crear categoría: {}", e.getMessage(), e);
            throw new RuntimeException("Error al obtener una categoría válida", e);
        }
    }

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

        // Nota: Subcategory ya no se relaciona con Category sino con TypeFood

        if (categoryRepository.existsById(id)) {
            Category category = categoryRepository.findById(id).get();
            categoryRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(category);
        }

        throw new RequestException("No existe categoría.");
    }

    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    public ResponseEntity<?> getCategoryById(Long id) {
        Optional<Category> category = categoryRepository.findById(id);
        if (category.isPresent()) {
            return ResponseEntity.ok(category.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Categoría no encontrada");
        }
    }

    public ResponseEntity<?> createCategory(Category category) {
        try {
            Category savedCategory = categoryRepository.save(category);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedCategory);
        } catch (Exception e) {
            logger.error("Error al crear categoría: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al crear categoría: " + e.getMessage());
        }
    }

    public ResponseEntity<?> updateCategory(Long id, Category category) {
        try {
            if (categoryRepository.existsById(id)) {
                category.setId(id);
                Category updatedCategory = categoryRepository.save(category);
                return ResponseEntity.ok(updatedCategory);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Categoría no encontrada");
            }
        } catch (Exception e) {
            logger.error("Error al actualizar categoría: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar categoría: " + e.getMessage());
        }
    }

    public ResponseEntity<?> deleteCategory(Long id) {
        try {
            if (categoryRepository.existsById(id)) {
                // Validar referencias antes de eliminar
                if (productRepository.existsByCategory(id)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("No puede ser eliminado, existe product(s) registrados con la categoría.");
                }
                // Nota: Subcategory ya no se relaciona con Category sino con TypeFood
                categoryRepository.deleteById(id);
                return ResponseEntity.ok().body("Categoría eliminada exitosamente");
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Categoría no encontrada");
            }
        } catch (Exception e) {
            logger.error("Error al eliminar categoría: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al eliminar categoría: " + e.getMessage());
        }
    }
}
