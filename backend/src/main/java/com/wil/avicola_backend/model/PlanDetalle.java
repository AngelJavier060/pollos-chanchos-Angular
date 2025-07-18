package com.wil.avicola_backend.model;

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
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
@Table(name = "plan_detalle",
       indexes = {
           @Index(name = "idx_detalle_plan", columnList = "plan_id"),
           @Index(name = "idx_detalle_product", columnList = "product_id"),
           @Index(name = "idx_detalle_days", columnList = "dayStart, dayEnd")
       })
@EntityListeners(AuditingEntityListener.class)
public class PlanDetalle {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "El plan de alimentación es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private PlanAlimentacion planAlimentacion;
    
    @NotNull(message = "El día inicial es obligatorio")
    private Integer dayStart;
    
    @NotNull(message = "El día final es obligatorio")
    private Integer dayEnd;
    
    @NotNull(message = "El producto es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id")
    private Animal animal;
    
    @NotNull(message = "La cantidad por animal es obligatoria")
    private Double quantityPerAnimal;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Frequency frequency = Frequency.DIARIA;
    
    private String instructions;
    
    @CreatedDate
    private LocalDateTime createDate;
    
    @LastModifiedDate
    private LocalDateTime updateDate;
    
    public enum Frequency {
        DIARIA, SEMANAL, QUINCENAL
    }
} 