package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.Product;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends CrudRepository<Product, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(prod)> 0 then true else false end FROM Product prod WHERE prod.id != ?1 AND prod.name = ?2")
    boolean existsByNameOther(long id, String name);

    // relacion con proveedor
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.provider.id = ?1")
    boolean existsByProvider(long provider_id);

    // relacion con tipo de alimento
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.typeFood.id = ?1")
    boolean existsByTypeFood(long typeFood_id);

    // relacion con unidad de medida
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.unitMeasurement.id = ?1")
    boolean existsByUnitMeasurement(long unitMeasurement_id);

    // relacion con animal
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.animal.id = ?1")
    boolean existsByAnimal(long animal_id);
    
    // relacion con etapa
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.stage.id = ?1")
    boolean existsByStage(long stage_id);
    
    // relacion con categoria
    @Query("SELECT case when count(product)> 0 then true else false end FROM Product product WHERE product.category.id = ?1")
    boolean existsByCategory(long category_id);

    // Listado solo de productos activos
    Iterable<Product> findByActiveTrue();

    // Listar productos por tipo de alimento
    List<Product> findByTypeFood_Id(long typeFoodId);

    // Buscar primer producto por nombre (case-insensitive)
    Optional<Product> findFirstByNameIgnoreCase(String name);
}