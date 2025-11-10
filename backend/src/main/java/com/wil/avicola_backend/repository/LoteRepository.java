package com.wil.avicola_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

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

    // ========== Listados por estado y por animal ==========
    List<Lote> findByQuantityGreaterThan(int quantity);
    List<Lote> findByQuantityEquals(int quantity);
    List<Lote> findByRaceAnimalId(long animalId);
    List<Lote> findByRaceAnimalIdAndQuantityGreaterThan(long animalId, int quantity);
    List<Lote> findByRaceAnimalIdAndQuantityEquals(long animalId, int quantity);

    // ========== Conteos ==========
    long countByQuantityGreaterThan(int quantity);
    long countByQuantityEquals(int quantity);
    long countByRaceAnimalId(long animalId);
    long countByRaceAnimalIdAndQuantityGreaterThan(long animalId, int quantity);
    long countByRaceAnimalIdAndQuantityEquals(long animalId, int quantity);

    // ========== Sumatorias ==========
    @Query("SELECT COALESCE(SUM(l.quantity), 0) FROM Lote l")
    Long sumQuantity();

    @Query("SELECT COALESCE(SUM(l.quantity), 0) FROM Lote l WHERE l.race.animal.id = :animalId")
    Long sumQuantityByAnimalId(@Param("animalId") Long animalId);

    @Query("SELECT COALESCE(SUM(l.quantityOriginal), 0) FROM Lote l")
    Long sumQuantityOriginal();

    @Query("SELECT COALESCE(SUM(l.quantityOriginal), 0) FROM Lote l WHERE l.race.animal.id = :animalId")
    Long sumQuantityOriginalByAnimalId(@Param("animalId") Long animalId);

    // ========== Histórico por rango de fechas de cierre ==========
    @Query("SELECT l FROM Lote l WHERE l.quantity = 0 AND (l.fechaCierre BETWEEN :desde AND :hasta OR l.fechaCierre IS NULL) ORDER BY l.fechaCierre DESC")
    List<Lote> findHistoricoByFechaCierreBetween(@Param("desde") java.time.LocalDateTime desde,
                                                 @Param("hasta") java.time.LocalDateTime hasta);

    @Query("SELECT l FROM Lote l WHERE l.quantity = 0 AND l.race.animal.id = :animalId AND (l.fechaCierre BETWEEN :desde AND :hasta OR l.fechaCierre IS NULL) ORDER BY l.fechaCierre DESC")
    List<Lote> findHistoricoByAnimalAndFechaCierreBetween(@Param("animalId") long animalId,
                                                          @Param("desde") java.time.LocalDateTime desde,
                                                          @Param("hasta") java.time.LocalDateTime hasta);
}