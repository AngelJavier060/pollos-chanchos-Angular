package com.wil.avicola_backend.service;

import com.wil.avicola_backend.model.Role;
import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.repository.RoleRepository;
import com.wil.avicola_backend.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado con id: " + id));
    }

    public Role getRoleByName(ERole name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado con nombre: " + name));
    }

    @Transactional
    public Role createRole(ERole name) {
        if (roleRepository.existsByName(name)) {
            throw new RuntimeException("El nombre del rol ya está en uso");
        }

        Role role = new Role(name);
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado con id: " + id));
        
        roleRepository.delete(role);
    }
}
