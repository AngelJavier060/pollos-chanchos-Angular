package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.entity.ValidacionAlimentacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ValidacionAlimentacionRepository extends JpaRepository<ValidacionAlimentacion, Long> {
    
    Optional<ValidacionAlimentacion> findByTipoAnimalAndEtapaAndActivo(
        String tipoAnimal, 
        String etapa, 
        Boolean activo
    );
    
    List<ValidacionAlimentacion> findByTipoAnimalAndActivo(String tipoAnimal, Boolean activo);
    
    List<ValidacionAlimentacion> findByActivoOrderByTipoAnimalAscEtapaAsc(Boolean activo);
}
