package com.wil.avicola_backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Lote;

public interface LoteRepository extends CrudRepository<Lote, String> {

    // relacion con race
    @Query("SELECT case when count(lote)> 0 then true else false end FROM Lote lote WHERE lote.race.id = ?1")
    boolean existsByRace(long race_id);
    
    // Método para buscar lote por código
    Optional<Lote> findByCodigo(String codigo);
    
    // Método para verificar si existe un lote con el mismo nombre para un tipo de animal específico
    @Query("SELECT case when count(lote)> 0 then true else false end FROM Lote lote " + 
           "WHERE lote.name = ?1 AND lote.race.animal.id = ?2")
    boolean existsByNameAndAnimalId(String name, long animalId);
    
    // Método para verificar si existe otro lote con el mismo nombre para un tipo de animal específico, excluyendo el lote actual
    @Query("SELECT case when count(lote)> 0 then true else false end FROM Lote lote " + 
           "WHERE lote.name = ?1 AND lote.race.animal.id = ?2 AND lote.id != ?3")
    boolean existsByNameAndAnimalIdExcludingId(String name, long animalId, String loteId);
}