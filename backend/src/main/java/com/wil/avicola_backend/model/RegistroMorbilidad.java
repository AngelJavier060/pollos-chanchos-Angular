package com.wil.avicola_backend.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "registros_morbilidad")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RegistroMorbilidad {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "lote_id", nullable = false)
    private Long loteId;
    
    @Column(nullable = false)
    private LocalDate fecha;
    
    @Column(nullable = false)
    private LocalTime hora;
    
    @Column(name = "cantidad_enfermos", nullable = false)
    private Integer cantidadEnfermos;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "enfermedad_id", nullable = false)
    private Enfermedad enfermedad;
    
    @Column(name = "sintomas_observados", columnDefinition = "TEXT")
    private String sintomasObservados;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gravedad gravedad = Gravedad.LEVE;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_tratamiento", nullable = false)
    private EstadoTratamiento estadoTratamiento = EstadoTratamiento.EN_OBSERVACION;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicamento_id")
    @JsonIgnore
    private Medicamento medicamento;
    
    @Column(name = "dosis_aplicada")
    private String dosisAplicada;
    
    @Column(name = "fecha_inicio_tratamiento")
    private LocalDate fechaInicioTratamiento;
    
    @Column(name = "fecha_fin_tratamiento")
    private LocalDate fechaFinTratamiento;
    
    @Column(name = "observaciones_veterinario", columnDefinition = "TEXT")
    private String observacionesVeterinario;
    
    @Column(name = "proxima_revision")
    private LocalDate proximaRevision;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal costo;
    
    @Column(name = "requiere_aislamiento", nullable = false)
    private Boolean requiereAislamiento = false;
    
    @Column(nullable = false)
    private Boolean contagioso = false;
    
    @Column(name = "usuario_registro")
    private String usuarioRegistro;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro = LocalDateTime.now();
    
    @Column(name = "dias_en_tratamiento")
    private Integer diasEnTratamiento = 0;
    
    @Column(name = "porcentaje_afectado", precision = 5, scale = 2)
    private BigDecimal porcentajeAfectado;
    
    @Column(name = "animales_tratados")
    private Integer animalesTratados = 0;
    
    @Column(name = "derivado_a_mortalidad", nullable = false)
    private Boolean derivadoAMortalidad = false;
    
    @CreationTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Enums
    public enum Gravedad {
        LEVE("leve"),
        MODERADA("moderada"),
        SEVERA("severa");
        
        private final String value;
        
        Gravedad(String value) {
            this.value = value;
        }
        
        public String getValue() {
            return value;
        }
    }
    
    public enum EstadoTratamiento {
        EN_OBSERVACION("en_observacion"),
        EN_TRATAMIENTO("en_tratamiento"),
        RECUPERADO("recuperado"),
        MOVIDO_A_MORTALIDAD("movido_a_mortalidad");
        
        private final String value;
        
        EstadoTratamiento(String value) {
            this.value = value;
        }
        
        public String getValue() {
            return value;
        }
    }
} 