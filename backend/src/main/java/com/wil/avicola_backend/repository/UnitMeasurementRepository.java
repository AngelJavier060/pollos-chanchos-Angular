package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.UnitMeasurement;

public interface UnitMeasurementRepository extends CrudRepository<UnitMeasurement, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(unit)> 0 then true else false end FROM UnitMeasurement unit WHERE unit.id != ?1 AND unit.name = ?2")
    boolean existsByNameOther(long id, String name);
}