package com.wil.avicola_backend.model;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Lote {
    @Id
    private String id; // Mantenemos UUID como identificador técnico
    
    @Column(unique = true)
    private String codigo; // Nuevo campo para código amigable (0001, 1001, etc.)
    
    @NotNull(message = "La cantidad es obligatoria")
    private int quantity;
    
    @NotNull(message = "La fecha de nacimiento es obligatoria")
    private Date birthdate;
    
    @NotNull(message = "El costo es obligatorio")
    private double cost;
    
    @NotBlank(message = "El nombre es obligatorio")
    private String name;

    @CreatedDate
    LocalDateTime create_date;
    @LastModifiedDate
    LocalDateTime update_date;

    @ManyToOne
    @JoinColumn(name = "race_id")
    private Race race;
    
    // Este campo no se persiste, solo se usa durante la generación del código
    @Transient
    private static final String PREFIJO_POLLO = "00";
    
    @Transient
    private static final String PREFIJO_CERDO = "10";
    
    @PrePersist
    public void generateId() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
