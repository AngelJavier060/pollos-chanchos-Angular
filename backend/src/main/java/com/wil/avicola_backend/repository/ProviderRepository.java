package com.wil.avicola_backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import com.wil.avicola_backend.model.Provider;

public interface ProviderRepository extends CrudRepository<Provider, Long> {

    boolean existsByName(String name);

    @Query("SELECT case when count(prov)> 0 then true else false end FROM Provider prov WHERE prov.id != ?1 AND prov.name = ?2")
    boolean existsByNameOther(long id, String name);
}