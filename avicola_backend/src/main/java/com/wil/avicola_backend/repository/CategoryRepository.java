package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Category;

public interface CategoryRepository extends CrudRepository<Category, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(cat)> 0 then true else false end FROM Category cat WHERE cat.id != ?1 AND cat.name = ?2")
    boolean existsByNameOther(long id, String name);
}