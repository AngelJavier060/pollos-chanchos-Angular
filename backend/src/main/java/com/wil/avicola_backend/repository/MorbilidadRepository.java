package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.RegistroMorbilidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MorbilidadRepository extends JpaRepository<RegistroMorbilidad, Long> {
    
    // Buscar por lote
    List<RegistroMorbilidad> findByLoteId(Long loteId);
    
    // Buscar por lote y estado
    List<RegistroMorbilidad> findByLoteIdAndEstadoTratamiento(Long loteId, RegistroMorbilidad.EstadoTratamiento estado);
    
    // Buscar activos (no recuperados ni derivados a mortalidad)
    @Query("SELECT r FROM RegistroMorbilidad r WHERE r.estadoTratamiento NOT IN ('RECUPERADO', 'MOVIDO_A_MORTALIDAD')")
    List<RegistroMorbilidad> findRegistrosActivos();
    
    // Buscar por enfermedad
    List<RegistroMorbilidad> findByEnfermedadId(Long enfermedadId);
    
    // Buscar por rango de fechas
    List<RegistroMorbilidad> findByFechaBetween(LocalDate fechaInicio, LocalDate fechaFin);
    
    // Buscar por lote y rango de fechas
    List<RegistroMorbilidad> findByLoteIdAndFechaBetween(Long loteId, LocalDate fechaInicio, LocalDate fechaFin);
    
    // Buscar por usuario
    List<RegistroMorbilidad> findByUsuarioRegistro(String usuarioRegistro);
    
    // Buscar por gravedad
    List<RegistroMorbilidad> findByGravedad(RegistroMorbilidad.Gravedad gravedad);
    
    // Buscar por estado de tratamiento
    List<RegistroMorbilidad> findByEstadoTratamiento(RegistroMorbilidad.EstadoTratamiento estado);
    
    // Buscar que requieren aislamiento
    List<RegistroMorbilidad> findByRequiereAislamientoTrue();
    
    // Buscar contagiosos
    List<RegistroMorbilidad> findByContagiosoTrue();
    
    // Buscar derivados a mortalidad
    List<RegistroMorbilidad> findByDerivadoAMortalidadTrue();
    
    // Buscar registros recientes (últimas 24 horas)
    @Query("SELECT r FROM RegistroMorbilidad r WHERE r.fechaRegistro >= :fechaInicio ORDER BY r.fechaRegistro DESC")
    List<RegistroMorbilidad> findRegistrosRecientes(@Param("fechaInicio") LocalDateTime fechaInicio);
    
    // Contar enfermos por lote
    @Query("SELECT SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r WHERE r.loteId = :loteId")
    Integer countEnfermosByLoteId(@Param("loteId") Long loteId);
    
    // Contar enfermos activos por lote
    @Query("SELECT SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r WHERE r.loteId = :loteId AND r.estadoTratamiento IN ('EN_OBSERVACION', 'EN_TRATAMIENTO')")
    Integer countEnfermosActivosByLoteId(@Param("loteId") Long loteId);
    
    // Estadísticas por enfermedad
    @Query("SELECT r.enfermedad.nombre, COUNT(r), SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r GROUP BY r.enfermedad.nombre ORDER BY COUNT(r) DESC")
    List<Object[]> getEstadisticasPorEnfermedad();
    
    // Estadísticas por enfermedad y rango de fechas
    @Query("SELECT r.enfermedad.nombre, COUNT(r), SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r WHERE r.fecha BETWEEN :fechaInicio AND :fechaFin GROUP BY r.enfermedad.nombre ORDER BY COUNT(r) DESC")
    List<Object[]> getEstadisticasPorEnfermedadAndFechaRange(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);
    
    // Estadísticas por estado de tratamiento
    @Query("SELECT r.estadoTratamiento, COUNT(r), SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r GROUP BY r.estadoTratamiento")
    List<Object[]> getEstadisticasPorEstado();
    
    // Eficacia de medicamentos
    @Query("SELECT m.nombre, COUNT(r), AVG(CASE WHEN r.estadoTratamiento = 'RECUPERADO' THEN 1 ELSE 0 END) * 100 " +
           "FROM RegistroMorbilidad r JOIN r.medicamento m " +
           "WHERE r.medicamento IS NOT NULL " +
           "GROUP BY m.nombre ORDER BY AVG(CASE WHEN r.estadoTratamiento = 'RECUPERADO' THEN 1 ELSE 0 END) DESC")
    List<Object[]> getEficaciaMedicamentos();
    
    // Tendencia diaria
    @Query("SELECT r.fecha, COUNT(r), SUM(r.cantidadEnfermos) FROM RegistroMorbilidad r WHERE r.fecha >= :fechaInicio GROUP BY r.fecha ORDER BY r.fecha")
    List<Object[]> getTendenciaDiaria(@Param("fechaInicio") LocalDate fechaInicio);
    
    // Buscar por próxima revisión
    List<RegistroMorbilidad> findByProximaRevision(LocalDate fecha);
    
    // Buscar revisiones pendientes
    List<RegistroMorbilidad> findByProximaRevisionLessThanEqualAndEstadoTratamientoIn(LocalDate fecha, List<RegistroMorbilidad.EstadoTratamiento> estados);
    
    // Costo total de tratamientos
    @Query("SELECT SUM(r.costo) FROM RegistroMorbilidad r WHERE r.costo IS NOT NULL")
    Double getCostoTotalTratamientos();
    
    // Costo total por rango de fechas
    @Query("SELECT SUM(r.costo) FROM RegistroMorbilidad r WHERE r.costo IS NOT NULL AND r.fecha BETWEEN :fechaInicio AND :fechaFin")
    Double getCostoTotalPorPeriodo(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);
    
    // Registros ordenados por fecha descendente
    List<RegistroMorbilidad> findAllByOrderByFechaRegistroDesc();
    
    // Registros por lote ordenados por fecha descendente
    List<RegistroMorbilidad> findByLoteIdOrderByFechaRegistroDesc(Long loteId);
} 