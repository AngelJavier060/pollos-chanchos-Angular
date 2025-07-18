package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.Category;
import java.util.List;

@Repository
public interface CategoryRepository extends CrudRepository<Category, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(cat)> 0 then true else false end FROM Category cat WHERE cat.id != ?1 AND cat.name = ?2")
    boolean existsByNameOther(long id, String name);
    
    // Método para obtener todas las categorías (reemplaza el método findAll() de CrudRepository)
    @Override
    List<Category> findAll();
}