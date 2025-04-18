package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Lote;

public interface LoteRepository extends CrudRepository<Lote, String> {

    // relacion con gender
    @Query("SELECT case when count(lote)> 0 then true else false end FROM Lote lote WHERE lote.race.id = ?1")
    boolean existsByRace(long race_id);
}