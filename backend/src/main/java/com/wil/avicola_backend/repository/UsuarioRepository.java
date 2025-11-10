package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.ERole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
    
    Optional<Usuario> findByUsernameIgnoreCase(String username);
    
    Optional<Usuario> findByEmail(String email);
    
    Boolean existsByUsername(String username);
    
    Boolean existsByEmail(String email);
    
    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.active = true")
    long countByActiveTrue();
    
    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.active = false")
    long countByActiveFalse();
    
    @Query("SELECT COUNT(u) FROM Usuario u JOIN u.roles r WHERE r.name = ?1")
    long countByRoles_Name(ERole role);

    Optional<Usuario> findFirstByActiveTrueOrderByIdAsc();
}