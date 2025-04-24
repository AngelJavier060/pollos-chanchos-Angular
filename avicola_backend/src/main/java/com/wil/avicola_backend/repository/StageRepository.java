package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Stage;

public interface StageRepository extends CrudRepository<Stage, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(stage)> 0 then true else false end FROM Stage stage WHERE stage.id != ?1 AND stage.name = ?2")
    boolean existsByNameOther(long id, String name);
}