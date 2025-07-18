package com.wil.avicola_backend.model;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(name = "plan_alimentacion", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"name", "animal_id", "active"})
       },
       indexes = {
           @Index(name = "idx_plan_animal", columnList = "animal_id"),
           @Index(name = "idx_plan_created_by", columnList = "created_by_user_id"),
           @Index(name = "idx_plan_active", columnList = "active")
       })
@EntityListeners(AuditingEntityListener.class)
public class PlanAlimentacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "El nombre del plan es obligatorio")
    private String name;
    
    private String description;
    
    @NotNull(message = "El animal es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id")
    private Animal animal;
    
    @NotNull(message = "El usuario creador es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private Usuario createdByUser;
    
    @Builder.Default
    private Boolean active = true;
    
    @CreatedDate
    private LocalDateTime createDate;
    
    @LastModifiedDate
    private LocalDateTime updateDate;
    
    @OneToMany(mappedBy = "planAlimentacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<PlanDetalle> detalles;
    
    @OneToMany(mappedBy = "planAlimentacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<PlanAsignacion> asignaciones;
} 