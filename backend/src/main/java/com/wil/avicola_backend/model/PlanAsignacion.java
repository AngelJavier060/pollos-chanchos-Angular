package com.wil.avicola_backend.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
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
@Table(name = "plan_asignacion")
@EntityListeners(AuditingEntityListener.class)
public class PlanAsignacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "El plan de alimentación es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private PlanAlimentacion planAlimentacion;
    
    @NotNull(message = "El lote es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lote_id")
    private Lote lote;
    
    @NotNull(message = "El usuario asignado es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private Usuario assignedUser;
    
    @NotNull(message = "El usuario que asigna es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_user_id")
    private Usuario assignedByUser;
    
    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate startDate;
    
    private LocalDate endDate;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.ACTIVO;
    
    @CreatedDate
    private LocalDateTime createDate;
    
    @LastModifiedDate
    private LocalDateTime updateDate;
    
    @OneToMany(mappedBy = "planAsignacion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PlanEjecucion> ejecuciones;
    
    public enum Status {
        ACTIVO, PAUSADO, COMPLETADO
    }
} 