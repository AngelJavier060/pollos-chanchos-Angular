package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.ProviderRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;
import com.wil.avicola_backend.repository.UnitMeasurementRepository;

@Service
public class ProductService {

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

    public ResponseEntity<?> findProducts() {
        return ResponseEntity.ok().body(productRepository.findAll());
    }

    public ResponseEntity<Product> saveProduct(
            long id_provider,
            long id_type_food,
            long id_unit_measurement,
            long id_animal,
            Product product) {

        if (!providerRepository.existsById(id_provider)) {
            throw new RequestException("No existe proveedor.");
        }

        if (!typeFoodRepository.existsById(id_type_food)) {
            throw new RequestException("No existe ripo de alimento.");
        }

        if (!unitMeasurementRepository.existsById(id_unit_measurement)) {
            throw new RequestException("No existe unidad de medida.");
        }

        if (!animalRepository.existsById(id_animal)) {
            throw new RequestException("No existe animal.");
        }

        product.setProvider(providerRepository.findById(id_provider).get());
        product.setTypeFood(typeFoodRepository.findById(id_type_food).get());
        product.setUnitMeasurement(unitMeasurementRepository.findById(id_unit_measurement).get());
        product.setAnimal(animalRepository.findById(id_animal).get());

        Product product_new = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.OK).body(product_new);
    }

    public ResponseEntity<Product> updateProduct(Product product) {

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
    }

    public ResponseEntity<Product> deleteProduct(long id) {

        if (productRepository.existsById(id)) {
            Product product = productRepository.findById(id).get();
            productRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(product);
        }

        throw new RequestException("No existe producto.");
    }
}
