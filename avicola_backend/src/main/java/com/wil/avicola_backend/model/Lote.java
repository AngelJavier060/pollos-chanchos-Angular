package com.wil.avicola_backend.model;

import java.time.LocalDateTime;
import java.util.Date;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
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
    @NotBlank(message = "Por favor, ingrese código.")
    private String id;
    private int quantity;
    private Date birthdate;
    private double cost;

    @CreatedDate
    LocalDateTime create_date;
    @LastModifiedDate
    LocalDateTime update_date;

    @ManyToOne
    @JoinColumn(name = "race_id")
    private Race race;
}
