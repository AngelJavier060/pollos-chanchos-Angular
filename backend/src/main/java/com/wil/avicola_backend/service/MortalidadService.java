package com.wil.avicola_backend.service;

import com.wil.avicola_backend.model.CausaMortalidad;
import com.wil.avicola_backend.model.RegistroMortalidad;
import com.wil.avicola_backend.repository.CausaMortalidadRepository;
import com.wil.avicola_backend.repository.MortalidadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class MortalidadService {
    
    @Autowired
    private MortalidadRepository mortalidadRepository;
    
    @Autowired
    private CausaMortalidadRepository causaMortalidadRepository;
    
    // ========== OPERACIONES CRUD ==========
    
    /**
     * Crear un nuevo registro de mortalidad
     */
    public RegistroMortalidad crearRegistro(RegistroMortalidad registro) {
        registro.setFechaRegistro(LocalDateTime.now());
        return mortalidadRepository.save(registro);
    }
    
    /**
     * Obtener un registro por ID
     */
    public Optional<RegistroMortalidad> obtenerRegistroPorId(Long id) {
        return mortalidadRepository.findById(id);
    }
    
    /**
     * Obtener todos los registros
     */
    public List<RegistroMortalidad> obtenerTodosLosRegistros() {
        return mortalidadRepository.findAllByOrderByFechaRegistroDesc();
    }
    
    /**
     * Actualizar un registro
     */
    public RegistroMortalidad actualizarRegistro(Long id, RegistroMortalidad registroActualizado) {
        Optional<RegistroMortalidad> existente = mortalidadRepository.findById(id);
        if (existente.isPresent()) {
            RegistroMortalidad registro = existente.get();
            registro.setCantidadMuertos(registroActualizado.getCantidadMuertos());
            registro.setCausa(registroActualizado.getCausa());
            registro.setObservaciones(registroActualizado.getObservaciones());
            registro.setPeso(registroActualizado.getPeso());
            registro.setEdad(registroActualizado.getEdad());
            registro.setUbicacion(registroActualizado.getUbicacion());
            registro.setConfirmado(registroActualizado.getConfirmado());
            return mortalidadRepository.save(registro);
        }
        throw new RuntimeException("Registro de mortalidad no encontrado con ID: " + id);
    }
    
    /**
     * Eliminar un registro
     */
    public void eliminarRegistro(Long id) {
        if (mortalidadRepository.existsById(id)) {
            mortalidadRepository.deleteById(id);
        } else {
            throw new RuntimeException("Registro de mortalidad no encontrado con ID: " + id);
        }
    }
    
    /**
     * Confirmar un registro
     */
    public RegistroMortalidad confirmarRegistro(Long id) {
        Optional<RegistroMortalidad> registro = mortalidadRepository.findById(id);
        if (registro.isPresent()) {
            RegistroMortalidad r = registro.get();
            r.setConfirmado(true);
            return mortalidadRepository.save(r);
        }
        throw new RuntimeException("Registro de mortalidad no encontrado con ID: " + id);
    }
    
    // ========== CONSULTAS ESPECÍFICAS ==========
    
    /**
     * Obtener registros por lote
     */
    public List<RegistroMortalidad> obtenerRegistrosPorLote(Long loteId) {
        return mortalidadRepository.findByLoteIdOrderByFechaRegistroDesc(loteId);
    }
    
    /**
     * Obtener registros por lote y confirmados
     */
    public List<RegistroMortalidad> obtenerRegistrosPorLoteYConfirmados(Long loteId, Boolean confirmado) {
        return mortalidadRepository.findByLoteIdAndConfirmado(loteId, confirmado);
    }
    
    /**
     * Obtener registros por usuario
     */
    public List<RegistroMortalidad> obtenerRegistrosPorUsuario(String usuario) {
        return mortalidadRepository.findByUsuarioRegistro(usuario);
    }
    
    /**
     * Obtener registros por rango de fechas
     */
    public List<RegistroMortalidad> obtenerRegistrosPorRangoFechas(LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return mortalidadRepository.findByFechaRegistroBetween(fechaInicio, fechaFin);
    }
    
    /**
     * Obtener registros por lote y rango de fechas
     */
    public List<RegistroMortalidad> obtenerRegistrosPorLoteYRangoFechas(Long loteId, LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return mortalidadRepository.findByLoteIdAndFechaRegistroBetween(loteId, fechaInicio, fechaFin);
    }
    
    /**
     * Obtener registros no confirmados
     */
    public List<RegistroMortalidad> obtenerRegistrosNoConfirmados() {
        return mortalidadRepository.findByConfirmadoFalse();
    }
    
    /**
     * Obtener registros recientes (últimas 24 horas)
     */
    public List<RegistroMortalidad> obtenerRegistrosRecientes() {
        LocalDateTime hace24Horas = LocalDateTime.now().minusHours(24);
        return mortalidadRepository.findRegistrosRecientes(hace24Horas);
    }
    
    // ========== ESTADÍSTICAS ==========
    
    /**
     * Contar total de muertes por lote
     */
    public Integer contarMuertesPorLote(Long loteId) {
        Integer count = mortalidadRepository.countMuertesByLoteId(loteId);
        return count != null ? count : 0;
    }
    
    /**
     * Contar muertes por lote en un rango de fechas
     */
    public Integer contarMuertesPorLoteYRangoFechas(Long loteId, LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        Integer count = mortalidadRepository.countMuertesByLoteIdAndFechaRange(loteId, fechaInicio, fechaFin);
        return count != null ? count : 0;
    }
    
    /**
     * Obtener estadísticas por causa
     */
    public List<Object[]> obtenerEstadisticasPorCausa() {
        return mortalidadRepository.getEstadisticasPorCausa();
    }
    
    /**
     * Obtener estadísticas por causa y rango de fechas
     */
    public List<Object[]> obtenerEstadisticasPorCausaYRangoFechas(LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return mortalidadRepository.getEstadisticasPorCausaAndFechaRange(fechaInicio, fechaFin);
    }
    
    /**
     * Obtener tendencia diaria
     */
    public List<Object[]> obtenerTendenciaDiaria(int dias) {
        LocalDateTime fechaInicio = LocalDateTime.now().minusDays(dias);
        return mortalidadRepository.getTendenciaDiaria(fechaInicio);
    }
    
    /**
     * Obtener total de muertes en un período
     */
    public Integer obtenerTotalMuertesPorPeriodo(LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        Integer total = mortalidadRepository.getTotalMuertesPorPeriodo(fechaInicio, fechaFin);
        return total != null ? total : 0;
    }
    
    /**
     * Obtener mortalidad del día actual
     */
    public Integer obtenerMortalidadHoy() {
        LocalDateTime inicioHoy = LocalDate.now().atStartOfDay();
        LocalDateTime finHoy = inicioHoy.plusDays(1).minusSeconds(1);
        return obtenerTotalMuertesPorPeriodo(inicioHoy, finHoy);
    }
    
    // ========== GESTIÓN DE CAUSAS ==========
    
    /**
     * Obtener todas las causas de mortalidad
     */
    public List<CausaMortalidad> obtenerTodasLasCausas() {
        return causaMortalidadRepository.findAll();
    }
    
    /**
     * Obtener causas activas
     */
    public List<CausaMortalidad> obtenerCausasActivas() {
        return causaMortalidadRepository.findByActivoTrueOrderByNombre();
    }
    
    /**
     * Obtener causa por ID
     */
    public Optional<CausaMortalidad> obtenerCausaPorId(Long id) {
        return causaMortalidadRepository.findById(id);
    }
    
    /**
     * Crear nueva causa
     */
    public CausaMortalidad crearCausa(CausaMortalidad causa) {
        return causaMortalidadRepository.save(causa);
    }
    
    /**
     * Actualizar causa
     */
    public CausaMortalidad actualizarCausa(Long id, CausaMortalidad causaActualizada) {
        Optional<CausaMortalidad> existente = causaMortalidadRepository.findById(id);
        if (existente.isPresent()) {
            CausaMortalidad causa = existente.get();
            causa.setNombre(causaActualizada.getNombre());
            causa.setDescripcion(causaActualizada.getDescripcion());
            causa.setColor(causaActualizada.getColor());
            causa.setActivo(causaActualizada.getActivo());
            return causaMortalidadRepository.save(causa);
        }
        throw new RuntimeException("Causa de mortalidad no encontrada con ID: " + id);
    }
    
    /**
     * Eliminar causa
     */
    public void eliminarCausa(Long id) {
        if (causaMortalidadRepository.existsById(id)) {
            causaMortalidadRepository.deleteById(id);
        } else {
            throw new RuntimeException("Causa de mortalidad no encontrada con ID: " + id);
        }
    }
} 