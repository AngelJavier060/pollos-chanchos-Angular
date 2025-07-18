package com.wil.avicola_backend.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
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
@Table(name = "plan_ejecucion")
@EntityListeners(AuditingEntityListener.class)
public class PlanEjecucion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ✅ PERMITIR NULL - Para registros manuales sin asignación específica
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asignacion_id", nullable = true)
    private PlanAsignacion planAsignacion;
    
    // ✅ PERMITIR NULL - Para registros manuales sin detalle específico
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "detalle_id", nullable = true)
    private PlanDetalle planDetalle;
    
    @NotNull(message = "El usuario ejecutor es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "executed_by_user_id")
    private Usuario executedByUser;
    
    @NotNull(message = "La fecha de ejecución es obligatoria")
    private LocalDate executionDate;
    
    @NotNull(message = "El número de día es obligatorio")
    private Integer dayNumber;
    
    @NotNull(message = "La cantidad aplicada es obligatoria")
    private Double quantityApplied;
    
    private String observations;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.PENDIENTE;
    
    // ✅ CAMPOS DE AUDITORÍA - Mapear correctamente a las nuevas columnas
    @Column(name = "editado")
    @Builder.Default
    private Boolean editado = false;
    
    @Column(name = "motivo_edicion")
    private String motivoEdicion;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "editado_por")
    private Usuario editadoPor;
    
    @Column(name = "fecha_edicion")
    private LocalDateTime fechaEdicion;
    
    @Column(name = "cantidad_original")
    private Double cantidadOriginal;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_original_id")
    private PlanDetalle planDetalleOriginal;
    
    @CreatedDate
    private LocalDateTime createDate;
    
    @LastModifiedDate
    private LocalDateTime updateDate;
    
    public enum Status {
        PENDIENTE, EJECUTADO, OMITIDO
    }
} 