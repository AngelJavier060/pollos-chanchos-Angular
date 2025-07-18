package com.wil.avicola_backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "validaciones_alimentacion")
public class ValidacionAlimentacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "tipo_animal", nullable = false, length = 20)
    private String tipoAnimal;
    
    @Column(name = "etapa", nullable = false, length = 50)
    private String etapa;
    
    @Column(name = "cantidad_minima_por_animal", nullable = false, precision = 8, scale = 3)
    private BigDecimal cantidadMinimaPorAnimal;
    
    @Column(name = "cantidad_maxima_por_animal", nullable = false, precision = 8, scale = 3)
    private BigDecimal cantidadMaximaPorAnimal;
    
    @Column(name = "porcentaje_alerta_minimo", precision = 5, scale = 2)
    private BigDecimal porcentajeAlertaMinimo = new BigDecimal("80.00");
    
    @Column(name = "porcentaje_alerta_maximo", precision = 5, scale = 2)
    private BigDecimal porcentajeAlertaMaximo = new BigDecimal("120.00");
    
    @Column(name = "activo")
    private Boolean activo = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    // Constructores
    public ValidacionAlimentacion() {}
    
    public ValidacionAlimentacion(String tipoAnimal, String etapa, 
                                 BigDecimal cantidadMinima, BigDecimal cantidadMaxima) {
        this.tipoAnimal = tipoAnimal;
        this.etapa = etapa;
        this.cantidadMinimaPorAnimal = cantidadMinima;
        this.cantidadMaximaPorAnimal = cantidadMaxima;
    }
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTipoAnimal() { return tipoAnimal; }
    public void setTipoAnimal(String tipoAnimal) { this.tipoAnimal = tipoAnimal; }
    
    public String getEtapa() { return etapa; }
    public void setEtapa(String etapa) { this.etapa = etapa; }
    
    public BigDecimal getCantidadMinimaPorAnimal() { return cantidadMinimaPorAnimal; }
    public void setCantidadMinimaPorAnimal(BigDecimal cantidadMinimaPorAnimal) { 
        this.cantidadMinimaPorAnimal = cantidadMinimaPorAnimal; 
    }
    
    public BigDecimal getCantidadMaximaPorAnimal() { return cantidadMaximaPorAnimal; }
    public void setCantidadMaximaPorAnimal(BigDecimal cantidadMaximaPorAnimal) { 
        this.cantidadMaximaPorAnimal = cantidadMaximaPorAnimal; 
    }
    
    public BigDecimal getPorcentajeAlertaMinimo() { return porcentajeAlertaMinimo; }
    public void setPorcentajeAlertaMinimo(BigDecimal porcentajeAlertaMinimo) { 
        this.porcentajeAlertaMinimo = porcentajeAlertaMinimo; 
    }
    
    public BigDecimal getPorcentajeAlertaMaximo() { return porcentajeAlertaMaximo; }
    public void setPorcentajeAlertaMaximo(BigDecimal porcentajeAlertaMaximo) { 
        this.porcentajeAlertaMaximo = porcentajeAlertaMaximo; 
    }
    
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
