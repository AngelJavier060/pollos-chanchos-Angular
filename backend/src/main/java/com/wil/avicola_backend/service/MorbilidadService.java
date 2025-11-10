package com.wil.avicola_backend.service;

import com.wil.avicola_backend.model.Enfermedad;
import com.wil.avicola_backend.model.Medicamento;
import com.wil.avicola_backend.model.RegistroMorbilidad;
import com.wil.avicola_backend.model.RegistroMortalidad;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.dto.ConvertirMortalidadDTO;
import com.wil.avicola_backend.repository.EnfermedadRepository;
import com.wil.avicola_backend.repository.MedicamentoRepository;
import com.wil.avicola_backend.repository.MorbilidadRepository;
import com.wil.avicola_backend.repository.LoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;

/**
 * Servicio para la gestión de la morbilidad
 */
@Service
@Transactional
public class MorbilidadService {
    
    @Autowired
    private MorbilidadRepository morbilidadRepository;
    
    @Autowired
    private EnfermedadRepository enfermedadRepository;
    
    @Autowired
    private MedicamentoRepository medicamentoRepository;
    
    @Autowired
    private MortalidadService mortalidadService;
    
    @Autowired
    private LoteRepository loteRepository;
    
    @PostConstruct
    public void seedEnfermedadesPorDefecto() {
        if (enfermedadRepository.count() == 0) {
            Enfermedad e1 = new Enfermedad();
            e1.setNombre("Newcastle");
            e1.setDescripcion("Enfermedad viral respiratoria");
            e1.setContagiosa(true);
            e1.setActivo(true);

            Enfermedad e2 = new Enfermedad();
            e2.setNombre("Coccidiosis");
            e2.setDescripcion("Infección parasitaria intestinal");
            e2.setContagiosa(true);
            e2.setActivo(true);

            Enfermedad e3 = new Enfermedad();
            e3.setNombre("Salmonelosis");
            e3.setDescripcion("Infección bacteriana digestiva");
            e3.setContagiosa(true);
            e3.setActivo(true);

            Enfermedad e4 = new Enfermedad();
            e4.setNombre("Bronquitis Infecciosa");
            e4.setDescripcion("Infección viral respiratoria");
            e4.setContagiosa(true);
            e4.setActivo(true);

            Enfermedad e5 = new Enfermedad();
            e5.setNombre("Estrés Térmico");
            e5.setDescripcion("Problemas por temperaturas extremas");
            e5.setContagiosa(false);
            e5.setActivo(true);

            enfermedadRepository.saveAll(Arrays.asList(e1, e2, e3, e4, e5));
        }
    }

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
    
    // ========== NUEVOS FLUJOS: RECUPERAR Y CONVERTIR A MORTALIDAD ==========
    public RegistroMorbilidad recuperar(Long id, Double costo) {
        Optional<RegistroMorbilidad> registroOpt = morbilidadRepository.findById(id);
        if (registroOpt.isEmpty()) throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
        RegistroMorbilidad r = registroOpt.get();
        r.setEstadoTratamiento(RegistroMorbilidad.EstadoTratamiento.RECUPERADO);
        r.setFechaFinTratamiento(LocalDate.now());
        if (costo != null) {
            r.setCosto(BigDecimal.valueOf(costo));
        }
        return morbilidadRepository.save(r);
    }

    public RegistroMorbilidad actualizarCosto(Long id, Double costo) {
        Optional<RegistroMorbilidad> registroOpt = morbilidadRepository.findById(id);
        if (registroOpt.isEmpty()) throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
        RegistroMorbilidad r = registroOpt.get();
        r.setCosto(costo != null ? BigDecimal.valueOf(costo) : null);
        return morbilidadRepository.save(r);
    }

    public RegistroMortalidad convertirAMortalidad(Long id, ConvertirMortalidadDTO dto) {
        Optional<RegistroMorbilidad> registroOpt = morbilidadRepository.findById(id);
        if (registroOpt.isEmpty()) throw new RuntimeException("Registro de morbilidad no encontrado con ID: " + id);
        RegistroMorbilidad morbilidad = registroOpt.get();

        if (dto.getCausaId() == null) {
            throw new RuntimeException("Se requiere causaId para convertir a mortalidad.");
        }
        if (dto.getCantidad() == null || dto.getCantidad() <= 0) {
            throw new RuntimeException("La cantidad a convertir debe ser > 0.");
        }

        // Resolver lote (UUID o código); si no se puede, usar fallback sin abortar
        Lote lote = resolveLote(dto.getLoteId(), dto.getLoteCodigo());

        // Crear registro de mortalidad y delegar descuento en MortalidadService
        RegistroMortalidad mortalidad = new RegistroMortalidad();
        if (lote != null) {
            mortalidad.setLoteId(lote.getId());
        } else {
            String idOrCodigo = (dto.getLoteId() != null && !dto.getLoteId().isBlank())
                ? dto.getLoteId()
                : (dto.getLoteCodigo() != null && !dto.getLoteCodigo().isBlank())
                    ? dto.getLoteCodigo()
                    : String.valueOf(morbilidad.getLoteId());
            mortalidad.setLoteId(idOrCodigo);
        }
        mortalidad.setCantidadMuertos(dto.getCantidad());
        mortalidad.setObservaciones(dto.getObservaciones());
        mortalidad.setPeso(dto.getPeso());
        mortalidad.setEdad(dto.getEdad());
        mortalidad.setUbicacion(dto.getUbicacion());
        mortalidad.setConfirmado(dto.getConfirmado() != null ? dto.getConfirmado() : Boolean.TRUE);
        mortalidad.setUsuarioRegistro(dto.getUsuarioRegistro());

        RegistroMortalidad creado = mortalidadService.crearRegistroConCausaId(mortalidad, dto.getCausaId());

        // Actualizar estado de morbilidad
        morbilidad.setEstadoTratamiento(RegistroMorbilidad.EstadoTratamiento.MOVIDO_A_MORTALIDAD);
        morbilidad.setDerivadoAMortalidad(true);
        morbilidad.setFechaFinTratamiento(LocalDate.now());
        morbilidadRepository.save(morbilidad);

        return creado;
    }

    private Lote resolveLote(String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) {
            try {
                Optional<Lote> opt = loteRepository.findById(loteId);
                if (opt.isPresent()) return opt.get();
            } catch (Exception ignored) {}
        }
        if (loteCodigo != null && !loteCodigo.isBlank()) {
            return loteRepository.findByCodigo(loteCodigo).orElse(null);
        }
        return null;
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