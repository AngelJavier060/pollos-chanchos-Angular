package com.wil.avicola_backend.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "registros_mortalidad")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistroMortalidad {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "lote_id", nullable = false)
    private String loteId; // Cambiado de Long a String para soportar UUID
    
    @Column(name = "cantidad_muertos", nullable = false)
    private Integer cantidadMuertos;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "causa_id", nullable = false)
    private CausaMortalidad causa;
    
    @Column(columnDefinition = "TEXT")
    private String observaciones;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal peso;
    
    private Integer edad;
    
    private String ubicacion;
    
    @Column(nullable = false)
    private Boolean confirmado = false;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();
    
    @Column(name = "usuario_registro")
    private String usuarioRegistro;
    
    @CreationTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
} 