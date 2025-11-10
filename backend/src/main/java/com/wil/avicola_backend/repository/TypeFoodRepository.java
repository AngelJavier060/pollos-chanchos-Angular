package com.wil.avicola_backend.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.TypeFood;

public interface TypeFoodRepository extends CrudRepository<TypeFood, Long> {

    boolean existsByName(String name);
    Optional<TypeFood> findByNameIgnoreCase(String name);

    @Query("SELECT case when count(typeFood)> 0 then true else false end FROM TypeFood typeFood WHERE typeFood.id != ?1 AND typeFood.name = ?2")
    boolean existsByNameOther(long id, String name);
}