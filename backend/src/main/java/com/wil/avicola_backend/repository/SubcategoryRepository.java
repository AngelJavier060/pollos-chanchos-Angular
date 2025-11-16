package com.wil.avicola_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.Subcategory;

@Repository
public interface SubcategoryRepository extends JpaRepository<Subcategory, Long> {

    boolean existsByTypeFoodIdAndNameIgnoreCase(Long typeFoodId, String name);

    boolean existsByTypeFoodIdAndNameIgnoreCaseAndIdNot(Long typeFoodId, String name, Long id);

    List<Subcategory> findAllByTypeFoodIdOrderByNameAsc(Long typeFoodId);

    boolean existsByTypeFoodId(Long typeFoodId);

    @Query("SELECT s FROM Subcategory s LEFT JOIN FETCH s.typeFood tf")
    List<Subcategory> findAllWithTypeFood();

    @Query("SELECT s FROM Subcategory s LEFT JOIN FETCH s.typeFood tf WHERE tf.id IS NULL OR tf.id <> 0")
    List<Subcategory> findAllWithTypeFoodSafe();
}
