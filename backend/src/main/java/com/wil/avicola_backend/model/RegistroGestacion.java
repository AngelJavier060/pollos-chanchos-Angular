package com.wil.avicola_backend.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "gestacion_chancha")
public class RegistroGestacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lote_id", nullable = false, length = 255)
    private String loteId;

    @Column(name = "numero_en_lote", nullable = false)
    private Integer numeroEnLote;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 150)
    private String raza;

    @Column(name = "fecha_inseminacion", nullable = false)
    private LocalDate fechaInseminacion;

    @Column(name = "numero_parto", nullable = false)
    private Integer numeroParto = 1;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(nullable = false)
    private Boolean activa = true;

    @Column(name = "lote_codigo", length = 50)
    private String loteCodigo;

    @Column(name = "lote_nombre", length = 255)
    private String loteNombre;

    @Column(name = "usuario_registro", length = 255)
    private String usuarioRegistro;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
