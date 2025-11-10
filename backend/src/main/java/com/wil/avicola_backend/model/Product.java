package com.wil.avicola_backend.model;

import java.time.LocalDateTime;
import java.util.Date;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Column;
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
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    @NotBlank(message = "Por favor, ingrese nombre del producto.")
    private String name;
    private String name_stage;
    private int quantity;
    private double price_unit;
    private int number_facture;
    private Date date_compra;
    private double level_max;
    private double level_min;

    // Nueva descripción del producto
    private String description;

    @Column(nullable = false)
    private Boolean active;

    @CreatedDate
    LocalDateTime create_date;
    @LastModifiedDate
    LocalDateTime update_date;

    @ManyToOne
    @JoinColumn(name = "animal_id")
    private Animal animal;

    @ManyToOne
    @JoinColumn(name = "provider_id")
    private Provider provider;

    @ManyToOne
    @JoinColumn(name = "typeFood_id")
    private TypeFood typeFood;

    @ManyToOne
    @JoinColumn(name = "unitMeasurement_id")
    private UnitMeasurement unitMeasurement;
    
    @ManyToOne
    @JoinColumn(name = "stage_id")
    private Stage stage;
    
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

}
