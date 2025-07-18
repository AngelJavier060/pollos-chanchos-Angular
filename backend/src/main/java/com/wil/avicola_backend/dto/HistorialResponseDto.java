package com.wil.avicola_backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO para respuesta de historial - evita problemas de lazy initialization
 */
public class HistorialResponseDto {
    
    private Long id;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate executionDate;
    
    private Double quantityApplied;
    private String observations;
    private String status;
    private Integer dayNumber;
    private String loteId;
    private Integer animalesVivos;
    private Integer animalesMuertos;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createDate;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updateDate;
    
    // Información básica del usuario (sin relación lazy)
    private String usuarioNombre;
    private String usuarioId;
    
    // Información básica del lote (sin relación lazy)
    private String loteCodigo;
    private String loteDescripcion;
    
    // Constructores
    public HistorialResponseDto() {}
    
    public HistorialResponseDto(Long id, LocalDate executionDate, Double quantityApplied, 
                               String observations, String status, Integer dayNumber, 
                               String loteId, Integer animalesVivos, Integer animalesMuertos,
                               LocalDateTime createDate, LocalDateTime updateDate) {
        this.id = id;
        this.executionDate = executionDate;
        this.quantityApplied = quantityApplied;
        this.observations = observations;
        this.status = status;
        this.dayNumber = dayNumber;
        this.loteId = loteId;
        this.animalesVivos = animalesVivos;
        this.animalesMuertos = animalesMuertos;
        this.createDate = createDate;
        this.updateDate = updateDate;
    }
    
    // Getters y Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public LocalDate getExecutionDate() {
        return executionDate;
    }
    
    public void setExecutionDate(LocalDate executionDate) {
        this.executionDate = executionDate;
    }
    
    public Double getQuantityApplied() {
        return quantityApplied;
    }
    
    public void setQuantityApplied(Double quantityApplied) {
        this.quantityApplied = quantityApplied;
    }
    
    public String getObservations() {
        return observations;
    }
    
    public void setObservations(String observations) {
        this.observations = observations;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Integer getDayNumber() {
        return dayNumber;
    }
    
    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }
    
    public String getLoteId() {
        return loteId;
    }
    
    public void setLoteId(String loteId) {
        this.loteId = loteId;
    }
    
    public Integer getAnimalesVivos() {
        return animalesVivos;
    }
    
    public void setAnimalesVivos(Integer animalesVivos) {
        this.animalesVivos = animalesVivos;
    }
    
    public Integer getAnimalesMuertos() {
        return animalesMuertos;
    }
    
    public void setAnimalesMuertos(Integer animalesMuertos) {
        this.animalesMuertos = animalesMuertos;
    }
    
    public LocalDateTime getCreateDate() {
        return createDate;
    }
    
    public void setCreateDate(LocalDateTime createDate) {
        this.createDate = createDate;
    }
    
    public LocalDateTime getUpdateDate() {
        return updateDate;
    }
    
    public void setUpdateDate(LocalDateTime updateDate) {
        this.updateDate = updateDate;
    }
    
    public String getUsuarioNombre() {
        return usuarioNombre;
    }
    
    public void setUsuarioNombre(String usuarioNombre) {
        this.usuarioNombre = usuarioNombre;
    }
    
    public String getUsuarioId() {
        return usuarioId;
    }
    
    public void setUsuarioId(String usuarioId) {
        this.usuarioId = usuarioId;
    }
    
    public String getLoteCodigo() {
        return loteCodigo;
    }
    
    public void setLoteCodigo(String loteCodigo) {
        this.loteCodigo = loteCodigo;
    }
    
    public String getLoteDescripcion() {
        return loteDescripcion;
    }
    
    public void setLoteDescripcion(String loteDescripcion) {
        this.loteDescripcion = loteDescripcion;
    }
}
