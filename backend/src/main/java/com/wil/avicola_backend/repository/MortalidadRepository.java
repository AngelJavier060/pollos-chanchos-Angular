package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.RegistroMortalidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MortalidadRepository extends JpaRepository<RegistroMortalidad, Long> {
    
    // Buscar por lote
    List<RegistroMortalidad> findByLoteId(Long loteId);
    
    // Buscar por lote y confirmados
    List<RegistroMortalidad> findByLoteIdAndConfirmado(Long loteId, Boolean confirmado);
    
    // Buscar por usuario
    List<RegistroMortalidad> findByUsuarioRegistro(String usuarioRegistro);
    
    // Buscar por rango de fechas
    List<RegistroMortalidad> findByFechaRegistroBetween(LocalDateTime fechaInicio, LocalDateTime fechaFin);
    
    // Buscar por lote y rango de fechas
    List<RegistroMortalidad> findByLoteIdAndFechaRegistroBetween(Long loteId, LocalDateTime fechaInicio, LocalDateTime fechaFin);
    
    // Buscar registros no confirmados
    List<RegistroMortalidad> findByConfirmadoFalse();
    
    // Buscar registros recientes (últimas 24 horas)
    @Query("SELECT r FROM RegistroMortalidad r WHERE r.fechaRegistro >= :fechaInicio ORDER BY r.fechaRegistro DESC")
    List<RegistroMortalidad> findRegistrosRecientes(@Param("fechaInicio") LocalDateTime fechaInicio);
    
    // Contar muertes por lote
    @Query("SELECT SUM(r.cantidadMuertos) FROM RegistroMortalidad r WHERE r.loteId = :loteId")
    Integer countMuertesByLoteId(@Param("loteId") Long loteId);
    
    // Contar muertes por lote y rango de fechas
    @Query("SELECT SUM(r.cantidadMuertos) FROM RegistroMortalidad r WHERE r.loteId = :loteId AND r.fechaRegistro BETWEEN :fechaInicio AND :fechaFin")
    Integer countMuertesByLoteIdAndFechaRange(@Param("loteId") Long loteId, @Param("fechaInicio") LocalDateTime fechaInicio, @Param("fechaFin") LocalDateTime fechaFin);
    
    // Estadísticas por causa
    @Query("SELECT r.causa.nombre, SUM(r.cantidadMuertos) FROM RegistroMortalidad r GROUP BY r.causa.nombre ORDER BY SUM(r.cantidadMuertos) DESC")
    List<Object[]> getEstadisticasPorCausa();
    
    // Estadísticas por causa y rango de fechas
    @Query("SELECT r.causa.nombre, SUM(r.cantidadMuertos) FROM RegistroMortalidad r WHERE r.fechaRegistro BETWEEN :fechaInicio AND :fechaFin GROUP BY r.causa.nombre ORDER BY SUM(r.cantidadMuertos) DESC")
    List<Object[]> getEstadisticasPorCausaAndFechaRange(@Param("fechaInicio") LocalDateTime fechaInicio, @Param("fechaFin") LocalDateTime fechaFin);
    
    // Tendencia diaria
    @Query("SELECT DATE(r.fechaRegistro), SUM(r.cantidadMuertos) FROM RegistroMortalidad r WHERE r.fechaRegistro >= :fechaInicio GROUP BY DATE(r.fechaRegistro) ORDER BY DATE(r.fechaRegistro)")
    List<Object[]> getTendenciaDiaria(@Param("fechaInicio") LocalDateTime fechaInicio);
    
    // Buscar por causa
    List<RegistroMortalidad> findByCausaId(Long causaId);
    
    // Total de muertes en un período
    @Query("SELECT SUM(r.cantidadMuertos) FROM RegistroMortalidad r WHERE r.fechaRegistro BETWEEN :fechaInicio AND :fechaFin")
    Integer getTotalMuertesPorPeriodo(@Param("fechaInicio") LocalDateTime fechaInicio, @Param("fechaFin") LocalDateTime fechaFin);
    
    // Registros ordenados por fecha descendente
    List<RegistroMortalidad> findAllByOrderByFechaRegistroDesc();
    
    // Registros por lote ordenados por fecha descendente
    List<RegistroMortalidad> findByLoteIdOrderByFechaRegistroDesc(Long loteId);
} 