package com.wil.avicola_backend.service;

import com.wil.avicola_backend.model.Enfermedad;
import com.wil.avicola_backend.model.Medicamento;
import com.wil.avicola_backend.model.RegistroMorbilidad;
import com.wil.avicola_backend.repository.EnfermedadRepository;
import com.wil.avicola_backend.repository.MedicamentoRepository;
import com.wil.avicola_backend.repository.MorbilidadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class MorbilidadService {
    
    @Autowired
    private MorbilidadRepository morbilidadRepository;
    
    @Autowired
    private EnfermedadRepository enfermedadRepository;
    
    @Autowired
    private MedicamentoRepository medicamentoRepository;
    
    // ========== OPERACIONES CRUD ==========
    
    /**
     * Crear un nuevo registro de morbilidad
     */
    public RegistroMorbilidad crearRegistro(RegistroMorbilidad registro) {
        registro.setFechaRegistro(LocalDateTime.now());
        return morbilidadRepository.save(registro);
    }
    
    /**
     * Obtener un registro por ID
     */
    public Optional<RegistroMorbilidad> obtenerRegistroPorId(Long id) {
        return morbilidadRepository.findById(id);
    }
    
    /**
     * Obtener todos los registros
     */
    public List<RegistroMorbilidad> obtenerTodosLosRegistros() {
        return morbilidadRepository.findAllByOrderByFechaRegistroDesc();
    }
    
    /**
     * Actualizar un registro
     */
    public RegistroMorbilidad actualizarRegistro(Long id, RegistroMorbilidad registroActualizado) {
        Optional<RegistroMorbilidad> existente = morbilidadRepository.findById(id);
        if (existente.isPresent()) {
            RegistroMorbilidad registro = existente.get();
            registro.setCantidadEnfermos(registroActualizado.getCantidadEnfermos());
            registro.setEnfermedad(registroActualizado.getEnfermedad());
            registro.setSintomasObservados(registroActualizado.getSintomasObservados());
            registro.setGravedad(registroActualizado.getGravedad());
            registro.setEstadoTratamiento(registroActualizado.getEstadoTratamiento());
            registro.setMedicamento(registroActualizado.getMedicamento());
            registro.setDosisAplicada(registroActualizado.getDosisAplicada());
            registro.setFechaInicioTratamiento(registroActualizado.getFechaInicioTratamiento());
            registro.setFechaFinTratamiento(registroActualizado.getFechaFinTratamiento());
            registro.setObservacionesVeterinario(registroActualizado.getObservacionesVeterinario());
            registro.setProximaRevision(registroActualizado.getProximaRevision());
            registro.setCosto(registroActualizado.getCosto());
            registro.setRequiereAislamiento(registroActualizado.getRequiereAislamiento());
            registro.setContagioso(registroActualizado.getContagioso());
            return morbilidadRepository.save(registro);
        }
        throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
    }
    
    /**
     * Eliminar un registro
     */
    public void eliminarRegistro(Long id) {
        if (morbilidadRepository.existsById(id)) {
            morbilidadRepository.deleteById(id);
        } else {
            throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
        }
    }
    
    /**
     * Cambiar estado de tratamiento
     */
    public RegistroMorbilidad cambiarEstadoTratamiento(Long id, RegistroMorbilidad.EstadoTratamiento nuevoEstado) {
        Optional<RegistroMorbilidad> registro = morbilidadRepository.findById(id);
        if (registro.isPresent()) {
            RegistroMorbilidad r = registro.get();
            r.setEstadoTratamiento(nuevoEstado);
            
            // Establecer fechas según el estado
            if (nuevoEstado == RegistroMorbilidad.EstadoTratamiento.RECUPERADO) {
                r.setFechaFinTratamiento(LocalDate.now());
            } else if (nuevoEstado == RegistroMorbilidad.EstadoTratamiento.MOVIDO_A_MORTALIDAD) {
                r.setDerivadoAMortalidad(true);
                r.setFechaFinTratamiento(LocalDate.now());
            }
            
            return morbilidadRepository.save(r);
        }
        throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
    }
    
    // ========== CONSULTAS ESPECÍFICAS ==========
    
    /**
     * Obtener registros por lote
     */
    public List<RegistroMorbilidad> obtenerRegistrosPorLote(Long loteId) {
        return morbilidadRepository.findByLoteIdOrderByFechaRegistroDesc(loteId);
    }
    
    /**
     * Obtener registros activos
     */
    public List<RegistroMorbilidad> obtenerRegistrosActivos() {
        return morbilidadRepository.findRegistrosActivos();
    }
    
    /**
     * Obtener registros por enfermedad
     */
    public List<RegistroMorbilidad> obtenerRegistrosPorEnfermedad(Long enfermedadId) {
        return morbilidadRepository.findByEnfermedadId(enfermedadId);
    }
    
    /**
     * Obtener registros por rango de fechas
     */
    public List<RegistroMorbilidad> obtenerRegistrosPorRangoFechas(LocalDate fechaInicio, LocalDate fechaFin) {
        return morbilidadRepository.findByFechaBetween(fechaInicio, fechaFin);
    }
    
    /**
     * Obtener registros por lote y rango de fechas
     */
    public List<RegistroMorbilidad> obtenerRegistrosPorLoteYRangoFechas(Long loteId, LocalDate fechaInicio, LocalDate fechaFin) {
        return morbilidadRepository.findByLoteIdAndFechaBetween(loteId, fechaInicio, fechaFin);
    }
    
    /**
     * Obtener registros por estado de tratamiento
     */
    public List<RegistroMorbilidad> obtenerRegistrosPorEstado(RegistroMorbilidad.EstadoTratamiento estado) {
        return morbilidadRepository.findByEstadoTratamiento(estado);
    }
    
    /**
     * Obtener registros que requieren aislamiento
     */
    public List<RegistroMorbilidad> obtenerRegistrosQueRequierenAislamiento() {
        return morbilidadRepository.findByRequiereAislamientoTrue();
    }
    
    /**
     * Obtener registros contagiosos
     */
    public List<RegistroMorbilidad> obtenerRegistrosContagiosos() {
        return morbilidadRepository.findByContagiosoTrue();
    }
    
    /**
     * Obtener registros recientes (últimas 24 horas)
     */
    public List<RegistroMorbilidad> obtenerRegistrosRecientes() {
        LocalDateTime hace24Horas = LocalDateTime.now().minusHours(24);
        return morbilidadRepository.findRegistrosRecientes(hace24Horas);
    }
    
    /**
     * Obtener revisiones pendientes
     */
    public List<RegistroMorbilidad> obtenerRevisionesDelDia(LocalDate fecha) {
        return morbilidadRepository.findByProximaRevision(fecha);
    }
    
    // ========== ESTADÍSTICAS ==========
    
    /**
     * Contar enfermos por lote
     */
    public Integer contarEnfermosPorLote(Long loteId) {
        Integer count = morbilidadRepository.countEnfermosByLoteId(loteId);
        return count != null ? count : 0;
    }
    
    /**
     * Contar enfermos activos por lote
     */
    public Integer contarEnfermosActivosPorLote(Long loteId) {
        Integer count = morbilidadRepository.countEnfermosActivosByLoteId(loteId);
        return count != null ? count : 0;
    }
    
    /**
     * Obtener estadísticas por enfermedad
     */
    public List<Object[]> obtenerEstadisticasPorEnfermedad() {
        return morbilidadRepository.getEstadisticasPorEnfermedad();
    }
    
    /**
     * Obtener estadísticas por enfermedad y rango de fechas
     */
    public List<Object[]> obtenerEstadisticasPorEnfermedadYRangoFechas(LocalDate fechaInicio, LocalDate fechaFin) {
        return morbilidadRepository.getEstadisticasPorEnfermedadAndFechaRange(fechaInicio, fechaFin);
    }
    
    /**
     * Obtener estadísticas por estado de tratamiento
     */
    public List<Object[]> obtenerEstadisticasPorEstado() {
        return morbilidadRepository.getEstadisticasPorEstado();
    }
    
    /**
     * Obtener eficacia de medicamentos
     */
    public List<Object[]> obtenerEficaciaMedicamentos() {
        return morbilidadRepository.getEficaciaMedicamentos();
    }
    
    /**
     * Obtener tendencia diaria
     */
    public List<Object[]> obtenerTendenciaDiaria(int dias) {
        LocalDate fechaInicio = LocalDate.now().minusDays(dias);
        return morbilidadRepository.getTendenciaDiaria(fechaInicio);
    }
    
    /**
     * Obtener costo total de tratamientos
     */
    public Double obtenerCostoTotalTratamientos() {
        Double costo = morbilidadRepository.getCostoTotalTratamientos();
        return costo != null ? costo : 0.0;
    }
    
    /**
     * Obtener costo total por período
     */
    public Double obtenerCostoTotalPorPeriodo(LocalDate fechaInicio, LocalDate fechaFin) {
        Double costo = morbilidadRepository.getCostoTotalPorPeriodo(fechaInicio, fechaFin);
        return costo != null ? costo : 0.0;
    }
    
    // ========== GESTIÓN DE ENFERMEDADES ==========
    
    /**
     * Obtener todas las enfermedades
     */
    public List<Enfermedad> obtenerTodasLasEnfermedades() {
        return enfermedadRepository.findAll();
    }
    
    /**
     * Obtener enfermedades activas
     */
    public List<Enfermedad> obtenerEnfermedadesActivas() {
        return enfermedadRepository.findByActivoTrueOrderByNombre();
    }
    
    /**
     * Obtener enfermedad por ID
     */
    public Optional<Enfermedad> obtenerEnfermedadPorId(Long id) {
        return enfermedadRepository.findById(id);
    }
    
    // ========== GESTIÓN DE MEDICAMENTOS ==========
    
    /**
     * Obtener todos los medicamentos
     */
    public List<Medicamento> obtenerTodosLosMedicamentos() {
        return medicamentoRepository.findAll();
    }
    
    /**
     * Obtener medicamentos activos
     */
    public List<Medicamento> obtenerMedicamentosActivos() {
        return medicamentoRepository.findByActivoTrueOrderByNombre();
    }
    
    /**
     * Obtener medicamento por ID
     */
    public Optional<Medicamento> obtenerMedicamentoPorId(Long id) {
        return medicamentoRepository.findById(id);
    }
} 