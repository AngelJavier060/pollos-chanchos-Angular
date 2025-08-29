package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.CategoryRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.ProviderRepository;
import com.wil.avicola_backend.repository.StageRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;
import com.wil.avicola_backend.repository.UnitMeasurementRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ProductService {
    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);

    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProviderRepository providerRepository;
    @Autowired
    private TypeFoodRepository typeFoodRepository;
    @Autowired
    private UnitMeasurementRepository unitMeasurementRepository;
    @Autowired
    private AnimalRepository animalRepository;
    @Autowired
    private StageRepository stageRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private CategoryService categoryService; // Añadido el servicio de categorías

    public ResponseEntity<?> findProducts() {
        return ResponseEntity.ok().body(productRepository.findAll());
    }

    public ResponseEntity<Product> saveProduct(
            long id_provider,
            long id_type_product,
            long id_unit_measurement,
            long id_animal,
            long id_stage,
            long id_category, // ID de categoría que podría no existir
            Product product) {

        try {
            logger.info("Guardando producto: {}", product);
            
            // Verificación del nombre del producto
            if (product.getName() == null || product.getName().trim().isEmpty()) {
                logger.error("Error: Nombre de producto no puede estar vacío");
                throw new RequestException("El nombre del producto es obligatorio");
            }

            // Verificaciones de existencia de entidades relacionadas
            if (!providerRepository.existsById(id_provider)) {
                throw new RequestException("No existe proveedor con ID: " + id_provider);
            }

            if (!typeFoodRepository.existsById(id_type_product)) {
                throw new RequestException("No existe tipo de producto con ID: " + id_type_product);
            }

            if (!unitMeasurementRepository.existsById(id_unit_measurement)) {
                throw new RequestException("No existe unidad de medida con ID: " + id_unit_measurement);
            }

            if (!animalRepository.existsById(id_animal)) {
                throw new RequestException("No existe animal con ID: " + id_animal);
            }

            if (!stageRepository.existsById(id_stage)) {
                throw new RequestException("No existe etapa con ID: " + id_stage);
            }

            // Intentar usar el ID de categoría proporcionado
            long categoryId = id_category;
            
            // Si la categoría no existe, usar el servicio para obtener o crear una válida
            if (!categoryRepository.existsById(categoryId)) {
                logger.warn("Categoría con ID: {} no existe, obteniendo una categoría válida", id_category);
                categoryId = categoryService.findOrCreateDefaultCategory();
                logger.info("Se usará la categoría con ID: {}", categoryId);
            }

            // Asignación segura de relaciones
            product.setProvider(providerRepository.findById(id_provider).orElse(null));
            product.setTypeFood(typeFoodRepository.findById(id_type_product).orElse(null));
            product.setUnitMeasurement(unitMeasurementRepository.findById(id_unit_measurement).orElse(null));
            product.setAnimal(animalRepository.findById(id_animal).orElse(null));
            product.setStage(stageRepository.findById(id_stage).orElse(null));
            product.setCategory(categoryRepository.findById(categoryId).orElse(null)); // Usando el ID que sabemos que es válido

            // Asignar valores por defecto si es necesario
            if (product.getName_stage() == null) {
                product.setName_stage("");
            }

            // Asegurar valor por defecto para 'active' si viene null del cliente
            if (product.getActive() == null) {
                product.setActive(Boolean.TRUE);
            }

            Product product_new = productRepository.save(product);
            logger.info("Producto guardado exitosamente con ID: {}", product_new.getId());
            return ResponseEntity.status(HttpStatus.OK).body(product_new);
        } catch (RequestException e) {
            logger.error("Error de validación al guardar producto: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error inesperado al guardar producto: {}", e.getMessage(), e);
            throw new RequestException("Error al guardar producto: " + e.getMessage());
        }
    }

    public ResponseEntity<Product> updateProduct(Product product) {
        try {
            if (productRepository.existsById(product.getId())) {

                Product product_old = productRepository.findById(product.getId()).get();

                product_old.setName(null != product.getName() ? product.getName() : product_old.getName());
                product_old.setName_stage(
                        null != product.getName_stage() ? product.getName_stage() : product_old.getName_stage());
                product_old.setQuantity(0 != product.getQuantity() ? product.getQuantity() : product_old.getQuantity());
                product_old.setPrice_unit(
                        0 != product.getPrice_unit() ? product.getPrice_unit() : product_old.getPrice_unit());
                product_old.setNumber_facture(
                        0 != product.getNumber_facture() ? product.getNumber_facture() : product_old.getNumber_facture());
                product_old.setDate_compra(
                        null != product.getDate_compra() ? product.getDate_compra() : product_old.getDate_compra());
                product_old.setLevel_min(0 != product.getLevel_min() ? product.getLevel_min() : product_old.getLevel_min());
                product_old.setLevel_max(0 != product.getLevel_max() ? product.getLevel_max() : product_old.getLevel_max());

                productRepository.save(product_old);
                return ResponseEntity.status(HttpStatus.OK).body(product_old);
            }
            throw new RequestException("No existe producto.");
        } catch (Exception e) {
            logger.error("Error al actualizar producto: {}", e.getMessage(), e);
            throw new RequestException("Error al actualizar producto: " + e.getMessage());
        }
    }

    public ResponseEntity<Product> deleteProduct(long id) {
        try {
            if (productRepository.existsById(id)) {
                Product product = productRepository.findById(id).get();
                productRepository.deleteById(id);
                return ResponseEntity.status(HttpStatus.OK).body(product);
            }
            throw new RequestException("No existe producto.");
        } catch (Exception e) {
            logger.error("Error al eliminar producto: {}", e.getMessage(), e);
            throw new RequestException("Error al eliminar producto: " + e.getMessage());
        }
    }
}
