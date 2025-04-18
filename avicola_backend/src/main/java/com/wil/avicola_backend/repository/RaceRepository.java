package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Race;

public interface RaceRepository extends CrudRepository<Race, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(race)> 0 then true else false end FROM Race race WHERE race.id != ?1 AND race.name = ?2")
    boolean existsByNameOther(long id, String name);

    // relacion con gender
    @Query("SELECT case when count(race)> 0 then true else false end FROM Race race WHERE race.animal.id = ?1")
    boolean existsByAnimal(long animal_id);
}