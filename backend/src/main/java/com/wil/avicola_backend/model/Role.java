package com.wil.avicola_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * Entidad que representa un rol de usuario en el sistema
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private ERole name;

    private String description;

    @ManyToMany(mappedBy = "roles")
    @Builder.Default
    @JsonIgnore
    private Set<Usuario> users = new HashSet<>();
    
    @ManyToMany
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    @JsonIgnore
    private Set<Permission> permissions = new HashSet<>();
    
    /**
     * Constructor para crear un rol con solo el nombre del rol
     * @param name Nombre del rol (enumeración ERole)
     */
    public Role(ERole name) {
        this.name = name;
        this.description = "Rol " + name.toString();
        this.users = new HashSet<>();
        this.permissions = new HashSet<>();
    }
}
