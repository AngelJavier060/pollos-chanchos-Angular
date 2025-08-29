package com.wil.avicola_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.wil.avicola_backend.model.NombreProducto;

@Repository
public interface NombreProductoRepository extends JpaRepository<NombreProducto, Long> {

    Optional<NombreProducto> findByNombreIgnoreCase(String nombre);

    @Query("SELECT np FROM NombreProducto np WHERE LOWER(np.nombre) LIKE LOWER(CONCAT('%', ?1, '%'))")
    List<NombreProducto> searchByNombre(String term);
}
