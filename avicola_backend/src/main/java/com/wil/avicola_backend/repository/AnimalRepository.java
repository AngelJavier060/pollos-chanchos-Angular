package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Animal;

public interface AnimalRepository extends CrudRepository<Animal, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(anim)> 0 then true else false end FROM Animal anim WHERE anim.id != ?1 AND anim.name = ?2")
    boolean existsByNameOther(long id, String name);
}