package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    
    Optional<Role> findByName(ERole name);
    
    Boolean existsByName(ERole name);
}
