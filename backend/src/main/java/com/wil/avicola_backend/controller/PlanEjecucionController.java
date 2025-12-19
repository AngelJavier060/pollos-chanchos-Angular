package com.wil.avicola_backend.controller;

import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.model.PlanEjecucion;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.repository.PlanEjecucionRepository;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.service.PlanEjecucionService;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Optional;
import com.wil.avicola_backend.dto.AlertaRapidaDto;
// Nuevos imports para el sistema de corrección
import com.wil.avicola_backend.service.CorreccionService;
import com.wil.avicola_backend.dto.CorreccionRequest;
import com.wil.avicola_backend.dto.ValidacionResult;
import com.wil.avicola_backend.dto.HistorialResponseDto;
import com.wil.avicola_backend.entity.PlanEjecucionHistorial;
import com.wil.avicola_backend.entity.ValidacionAlimentacion;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/plan-ejecucion")
public class PlanEjecucionController {
    
    @Autowired
    private PlanEjecucionService planEjecucionService;
    
    @Autowired
    private CorreccionService correccionService;
    
    @Autowired
    private PlanEjecucionRepository planEjecucionRepository;
    
    @Autowired
    private LoteRepository loteRepository;
    
    /**
     * Endpoint de prueba con información del estado del sistema
     */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        StringBuilder info = new StringBuilder();
        info.append("✅ Endpoint de plan ejecución funcionando correctamente\n\n");
        
        try {
            // Verificar datos básicos
            info.append("📊 ESTADO DEL SISTEMA:\n");
            info.append("- Fecha actual: ").append(java.time.LocalDate.now()).append("\n");
            info.append("- Hora del servidor: ").append(java.time.LocalDateTime.now()).append("\n");
            
            return ResponseEntity.ok(info.toString());
        } catch (Exception e) {
            return ResponseEntity.ok("Endpoint funcionando, pero error al verificar datos: " + e.getMessage());
        }
    }
    
    /**
     * Obtener programación diaria para el usuario autenticado
     */
    @GetMapping("/programacion-diaria")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<PlanEjecucion>> getProgramacionDiaria(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            Principal principal) {
        
        // Si no se proporciona fecha, usar la fecha actual
        if (fecha == null) {
            fecha = LocalDate.now();
        }
        
        // Obtener ID del usuario autenticado (temporalmente hardcodeado para debug)
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.getProgramacionDiariaUsuario(userId, fecha);
    }
    
    /**
     * Obtener programación diaria para un usuario específico (solo administradores)
     */
    @GetMapping("/programacion-diaria/usuario/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<PlanEjecucion>> getProgramacionDiariaUsuario(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        
        if (fecha == null) {
            fecha = LocalDate.now();
        }
        
        return planEjecucionService.getProgramacionDiariaUsuario(userId, fecha);
    }
    
    /**
     * Registrar ejecución de alimentación
     */
    @PostMapping("/registrar")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<PlanEjecucion> registrarEjecucion(
            @RequestBody EjecucionRequest request,
            Principal principal) {
        
        // Obtener ID del usuario autenticado
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.registrarEjecucion(
            request.getAsignacionId(),
            request.getDetalleId(),
            request.getDayNumber(),
            request.getCantidadAplicada(),
            request.getObservaciones(),
            userId
        );
    }
    
    /**
     * Registrar ejecución de alimentación (endpoint esperado por frontend)
     */
    @PostMapping("/registrar-alimentacion")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<PlanEjecucion> registrarAlimentacion(
            @RequestBody AlimentacionRequest request,
            Principal principal) {
        
        System.out.println("🍽️ === REGISTRAR ALIMENTACIÓN ===");
        System.out.println("Request recibido: " + request);
        
        // Obtener ID del usuario autenticado (temporalmente hardcodeado para debug)
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.registrarEjecucionCompleta(
            request.getLoteId(),
            request.getFecha(),
            request.getCantidadAplicada(),
            request.getAnimalesVivos(),
            request.getAnimalesMuertos(),
            request.getObservaciones(),
            userId
        );
    }

    /**
     * Obtener historial de ejecuciones del usuario
     */
    @GetMapping("/historial")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<PlanEjecucion>> getHistorialEjecuciones(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            Principal principal) {
        
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.getHistorialEjecuciones(userId, fechaInicio, fechaFin);
    }
    
    /**
     * Obtener ejecuciones pendientes del usuario
     */
    @GetMapping("/pendientes")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<PlanEjecucion>> getEjecucionesPendientes(Principal principal) {
        
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.getEjecucionesPendientes(userId);
    }
    
    /**
     * Marcar ejecución como omitida
     */
    @PutMapping("/{ejecucionId}/omitir")
    // @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<PlanEjecucion> marcarComoOmitida(
            @PathVariable Long ejecucionId,
            @RequestBody OmitirRequest request,
            Principal principal) {
        
        Long userId = 1L; // getUserIdFromPrincipal(principal);
        
        return planEjecucionService.marcarComoOmitida(ejecucionId, request.getRazon(), userId);
    }
    
    /**
     * Obtener estadísticas de ejecución para una asignación (solo administradores)
     */
    @GetMapping("/estadisticas/asignacion/{asignacionId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Object> getEstadisticasEjecucion(@PathVariable Long asignacionId) {
        return planEjecucionService.getEstadisticasEjecucion(asignacionId);
    }

    /**
     * Obtener alertas rápidas para el usuario autenticado (temporal userId=1)
     */
    @GetMapping("/alertas")
    public ResponseEntity<List<AlertaRapidaDto>> getAlertas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaBase,
            @RequestParam(required = false) Integer dias,
            Principal principal) {
        Long userId = 1L; // getUserIdFromPrincipal(principal)
        return planEjecucionService.getAlertasRapidas(userId, fechaBase, dias);
    }

    /**
     * Obtener alertas rápidas para un usuario específico (solo administradores)
     */
    @GetMapping("/alertas/usuario/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<AlertaRapidaDto>> getAlertasUsuario(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaBase,
            @RequestParam(required = false) Integer dias) {
        return planEjecucionService.getAlertasRapidas(userId, fechaBase, dias);
    }
    
    /**
     * Endpoint de diagnóstico para verificar datos (temporal)
     */
    @GetMapping("/debug/datos")
    public ResponseEntity<String> debugDatos() {
        StringBuilder info = new StringBuilder();
        info.append("🔍 DIAGNÓSTICO DEL SISTEMA\n\n");
        
        try {
            // Aquí podríamos agregar verificaciones básicas
            info.append("✅ Controlador funcionando correctamente\n");
            info.append("📅 Fecha: ").append(java.time.LocalDate.now()).append("\n");
            
            return ResponseEntity.ok(info.toString());
        } catch (Exception e) {
            return ResponseEntity.ok("Error en diagnóstico: " + e.getMessage());
        }
    }

    /**
     * Endpoint simple para verificar conectividad de frontend
     */
    @GetMapping("/debug/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong - " + java.time.LocalDateTime.now());
    }

    /**
     * ✅ TEMPORAL: Endpoint público para registrar alimentación (sin autenticación)
     */
    @PostMapping("/debug/registrar-alimentacion")
    public ResponseEntity<String> registrarAlimentacionPublico(
            @RequestBody AlimentacionRequest request) {
        
        System.out.println("🍽️ === REGISTRAR ALIMENTACIÓN (ENDPOINT DEBUG) ===");
        System.out.println("Request recibido: " + request);
        
        try {
            // 🔥 AHORA SÍ GUARDAR EN LA BASE DE DATOS
            ResponseEntity<PlanEjecucion> resultado = planEjecucionService.registrarEjecucionCompleta(
                request.getLoteId(),
                request.getFecha(),
                request.getCantidadAplicada(),
                request.getAnimalesVivos(),
                request.getAnimalesMuertos(),
                request.getObservaciones(),
                1L // Usuario por defecto para debug
            );
            
            if (resultado.getStatusCode().is2xxSuccessful()) {
                PlanEjecucion ejecucion = resultado.getBody();
                String response = String.format(
                    "✅ Alimentación guardada exitosamente en la base de datos!\n" +
                    "- ID del registro: %d\n" +
                    "- Lote: %s\n" +
                    "- Fecha: %s\n" +
                    "- Cantidad aplicada: %.2f kg\n" +
                    "- Animales vivos: %d\n" +
                    "- Animales muertos: %d\n" +
                    "- Observaciones: %s\n" +
                    "- Status: %s\n" +
                    "- Timestamp: %s",
                    ejecucion.getId(),
                    request.getLoteId(),
                    request.getFecha(),
                    request.getCantidadAplicada(),
                    request.getAnimalesVivos(),
                    request.getAnimalesMuertos(),
                    request.getObservaciones(),
                    ejecucion.getStatus(),
                    java.time.LocalDateTime.now()
                );
                
                System.out.println("✅ Registro guardado en BD con ID: " + ejecucion.getId());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body("Error al guardar el registro");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error al registrar alimentación: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    /**
     * ✅ TEMPORAL: Endpoint público para obtener historial (sin autenticación)
     * 🔥 SOLUCIONADO: Usa DTO para evitar lazy initialization exception
     * 🐔 Soporta filtro por especie (pollos, chanchos)
     */
    @GetMapping("/debug/historial")
    public ResponseEntity<List<HistorialResponseDto>> getHistorialPublico(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) String especie) {
        
        System.out.println("📚 === OBTENER HISTORIAL (ENDPOINT DEBUG PÚBLICO) ===");
        System.out.println("Fecha inicio: " + fechaInicio);
        System.out.println("Fecha fin: " + fechaFin);
        System.out.println("Especie filtro: " + (especie != null ? especie : "TODAS"));
        
        try {
            // Si no se proporcionan fechas, usar últimos 6 meses
            if (fechaInicio == null || fechaFin == null) {
                fechaFin = LocalDate.now();
                fechaInicio = fechaFin.minusMonths(6);
                System.out.println("✅ Usando rango por defecto - Inicio: " + fechaInicio + ", Fin: " + fechaFin);
            }
            
            // Variables finales para el stream
            final LocalDate fechaInicioFinal = fechaInicio;
            final LocalDate fechaFinFinal = fechaFin;
            
            // 🔥 CONSULTA CON JOIN FETCH - Carga las relaciones en una sola consulta
            System.out.println("🔍 Consultando registros con JOIN FETCH para evitar lazy loading...");
            
            // Usar consulta personalizada con JOIN FETCH
            List<PlanEjecucion> registros = planEjecucionRepository.findHistorialWithDetails(fechaInicioFinal, fechaFinFinal);
            
            System.out.println("✅ Registros obtenidos con JOIN FETCH: " + registros.size());
            
            // Variable final para usar en el stream
            final String especieFiltro = especie;
            
            List<HistorialResponseDto> registrosFiltrados = registros.stream()
                .map(pe -> {
                    // Convertir a DTO para evitar lazy initialization
                    HistorialResponseDto dto = new HistorialResponseDto(
                        pe.getId(),
                        pe.getExecutionDate(),
                        pe.getQuantityApplied(),
                        pe.getObservations(),
                        pe.getStatus() != null ? pe.getStatus().toString() : "PENDIENTE",
                        pe.getDayNumber(),
                        null, // loteId - se establecerá abajo
                        null, // animalesVivos - no disponible en esta entidad
                        null, // animalesMuertos - no disponible en esta entidad
                        pe.getCreateDate(),
                        pe.getUpdateDate()
                    );
                    
                    // Variable para guardar la especie del lote
                    String especieLote = null;
                    
                    // Mapear información del lote y usuario usando las relaciones cargadas
                    if (pe.getPlanAsignacion() != null && pe.getPlanAsignacion().getLote() != null) {
                        Lote lote = pe.getPlanAsignacion().getLote();
                        dto.setLoteId(lote.getId());
                        dto.setLoteCodigo(lote.getCodigo());
                        dto.setLoteDescripcion(lote.getName());
                        
                        // Obtener especie del lote
                        if (lote.getRace() != null && lote.getRace().getAnimal() != null) {
                            var animal = lote.getRace().getAnimal();
                            // Normalizar: si es ID=1 (pollos), etiquetar como 'pollos'
                            if (animal.getId() == 1L) {
                                especieLote = "pollos";
                            } else {
                                String nombreAnimal = animal.getName();
                                if (nombreAnimal != null) {
                                    String n = nombreAnimal.toLowerCase();
                                    // Sinónimos básicos
                                    if (n.contains("pollo") || n.contains("gallin") || n.contains("ave")) {
                                        especieLote = "pollos";
                                    } else if (n.contains("cerd") || n.contains("chancho")) {
                                        especieLote = "chanchos";
                                    } else {
                                        especieLote = nombreAnimal;
                                    }
                                }
                            }
                        }
                        
                        if (pe.getPlanAsignacion().getAssignedUser() != null) {
                            dto.setUsuarioNombre(pe.getPlanAsignacion().getAssignedUser().getUsername());
                            dto.setUsuarioId(pe.getPlanAsignacion().getAssignedUser().getId().toString());
                        }
                    } else {
                        // Para registros manuales: extraer loteId de observaciones y buscar nombre real
                        String loteIdExtraido = extraerLoteIdDeObservaciones(pe.getObservations());
                        if (loteIdExtraido != null && !loteIdExtraido.isEmpty()) {
                            Optional<Lote> loteOpt = loteRepository.findById(loteIdExtraido);
                            if (loteOpt.isPresent()) {
                                Lote lote = loteOpt.get();
                                dto.setLoteId(lote.getId());
                                dto.setLoteCodigo(lote.getCodigo() != null ? lote.getCodigo() : "S/C");
                                dto.setLoteDescripcion(lote.getName());
                                
                                // Obtener especie del lote manual
                                if (lote.getRace() != null && lote.getRace().getAnimal() != null) {
                                    var animal = lote.getRace().getAnimal();
                                    if (animal.getId() == 1L) {
                                        especieLote = "pollos";
                                    } else {
                                        String nombreAnimal = animal.getName();
                                        if (nombreAnimal != null) {
                                            String n = nombreAnimal.toLowerCase();
                                            if (n.contains("pollo") || n.contains("gallin") || n.contains("ave")) especieLote = "pollos";
                                            else if (n.contains("cerd") || n.contains("chancho")) especieLote = "chanchos";
                                            else especieLote = nombreAnimal;
                                        }
                                    }
                                }
                                
                                System.out.println("✅ Lote encontrado para registro manual: " + lote.getName() + " (Especie: " + especieLote + ")");
                            } else {
                                dto.setLoteId(loteIdExtraido);
                                dto.setLoteCodigo("MANUAL");
                                dto.setLoteDescripcion("Lote no encontrado: " + loteIdExtraido.substring(0, Math.min(8, loteIdExtraido.length())));
                            }
                        } else {
                            dto.setLoteId("LOT-MANUAL");
                            dto.setLoteCodigo("MANUAL");
                            dto.setLoteDescripcion("Registro Manual");
                        }
                    }
                    
                    // Guardar la especie en el DTO para filtrar después
                    dto.setEspecie(especieLote);
                    
                    // Mapear información del producto desde PlanDetalle
                    if (pe.getPlanDetalle() != null && pe.getPlanDetalle().getProduct() != null) {
                        dto.setProductoNombre(pe.getPlanDetalle().getProduct().getName());
                        dto.setProductoId(pe.getPlanDetalle().getProduct().getId());
                    } else {
                        // Intentar extraer producto de observaciones
                        String productoExtraido = extraerProductoDeObservaciones(pe.getObservations());
                        if (productoExtraido != null) {
                            dto.setProductoNombre(productoExtraido);
                        }
                    }
                    
                    // Mapear usuario ejecutor
                    if (pe.getExecutedByUser() != null) {
                        dto.setUsuarioNombre(pe.getExecutedByUser().getUsername());
                        dto.setUsuarioId(pe.getExecutedByUser().getId().toString());
                    } else {
                        dto.setUsuarioNombre("Usuario N/A");
                        dto.setUsuarioId("N/A");
                    }
                    
                    System.out.println("✅ Registro mapeado - ID: " + dto.getId() + ", Lote: " + dto.getLoteCodigo() + ", Especie: " + dto.getEspecie());
                    
                    return dto;
                })
                // Filtrar por especie si se especificó
                .filter(dto -> {
                    if (especieFiltro == null || especieFiltro.isEmpty()) {
                        return true; // Sin filtro, devolver todos
                    }
                    String especieDto = dto.getEspecie();
                    if (especieDto == null) {
                        // Si no tiene especie pero hay observaciones que mencionan "pollo", incluirlo
                        String obs = dto.getObservations() != null ? dto.getObservations().toLowerCase() : "";
                        String filtroNorm = especieFiltro.toLowerCase();
                        if (filtroNorm.contains("pollo") && (obs.contains("pollo") || obs.contains("lote") || dto.getLoteCodigo() != null)) {
                            return true; // Incluir registros manuales de pollos
                        }
                        return false; // Si no tiene especie y no hay indicios, excluir
                    }
                    // Comparar ignorando mayúsculas y acentos
                    String filtroNorm = especieFiltro.toLowerCase().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
                    String especieNorm = especieDto.toLowerCase().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
                    return especieNorm.contains(filtroNorm) || filtroNorm.contains(especieNorm);
                })
                .collect(Collectors.toList());
            
            System.out.println("✅ Registros después de filtrar por especie '" + (especie != null ? especie : "TODAS") + "': " + registrosFiltrados.size());
            
            return ResponseEntity.ok(registrosFiltrados);
            
        } catch (Exception e) {
            System.err.println("❌ Error al obtener historial: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ArrayList<>());
        }
    }

    // Nuevos endpoints para el sistema de corrección

    /**
     * Validar cantidad antes de registrar
     */
    @PostMapping("/validar")
    public ResponseEntity<ValidacionResult> validarCantidad(
            @RequestParam String tipoAnimal,
            @RequestParam String etapa,
            @RequestParam Double cantidadPorAnimal,
            @RequestParam Integer numeroAnimales) {
        
        try {
            ValidacionResult resultado = correccionService.validarCantidad(
                tipoAnimal, etapa, cantidadPorAnimal, numeroAnimales
            );
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ValidacionResult.error("Error al validar: " + e.getMessage())
            );
        }
    }

    /**
     * Corregir ejecución de alimentación
     */
    @PutMapping("/correccion/{ejecucionId}")
    public ResponseEntity<PlanEjecucion> corregirEjecucion(
            @PathVariable Long ejecucionId,
            @RequestBody CorreccionRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            // Agregar metadatos de la request
            request.setIpAddress(httpRequest.getRemoteAddr());
            request.setUserAgent(httpRequest.getHeader("User-Agent"));
            
            PlanEjecucion corregido = correccionService.corregirRegistro(request);
            return ResponseEntity.ok(corregido);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    /**
     * Verificar si se puede corregir un registro
     */
    @GetMapping("/puede-corregir/{ejecucionId}")
    public ResponseEntity<Boolean> puedeCorregir(
            @PathVariable Long ejecucionId,
            @RequestParam Long usuarioId) {
        
        boolean puede = correccionService.puedeCorregir(ejecucionId, usuarioId);
        return ResponseEntity.ok(puede);
    }

    /**
     * Obtener historial de cambios de un registro
     */
    @GetMapping("/historial/{ejecucionId}")
    public ResponseEntity<List<PlanEjecucionHistorial>> getHistorialCorrecciones(
            @PathVariable Long ejecucionId) {
        
        List<PlanEjecucionHistorial> historial = correccionService.obtenerHistorial(ejecucionId);
        return ResponseEntity.ok(historial);
    }

    /**
     * Obtener validaciones de alimentación
     */
    @GetMapping("/validaciones")
    public ResponseEntity<List<ValidacionAlimentacion>> getValidacionesAlimentacion() {
        List<ValidacionAlimentacion> validaciones = correccionService.obtenerValidaciones();
        return ResponseEntity.ok(validaciones);
    }

    // DTOs para requests
    public static class EjecucionRequest {
        private Long asignacionId;
        private Long detalleId;
        private Integer dayNumber;
        private Double cantidadAplicada;
        private String observaciones;
        
        // Getters y setters
        public Long getAsignacionId() { return asignacionId; }
        public void setAsignacionId(Long asignacionId) { this.asignacionId = asignacionId; }
        
        public Long getDetalleId() { return detalleId; }
        public void setDetalleId(Long detalleId) { this.detalleId = detalleId; }
        
        public Integer getDayNumber() { return dayNumber; }
        public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
        
        public Double getCantidadAplicada() { return cantidadAplicada; }
        public void setCantidadAplicada(Double cantidadAplicada) { this.cantidadAplicada = cantidadAplicada; }
        
        public String getObservaciones() { return observaciones; }
        public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
    }
    
    public static class OmitirRequest {
        private String razon;
        
        public String getRazon() { return razon; }
        public void setRazon(String razon) { this.razon = razon; }
    }

    public static class AlimentacionRequest {
        private String loteId;
        private String fecha;
        private Double cantidadAplicada;
        private Integer animalesVivos;
        private Integer animalesMuertos;
        private String observaciones;
        
        // Getters y setters
        public String getLoteId() { return loteId; }
        public void setLoteId(String loteId) { this.loteId = loteId; }
        
        public String getFecha() { return fecha; }
        public void setFecha(String fecha) { this.fecha = fecha; }
        
        public Double getCantidadAplicada() { return cantidadAplicada; }
        public void setCantidadAplicada(Double cantidadAplicada) { this.cantidadAplicada = cantidadAplicada; }
        
        public Integer getAnimalesVivos() { return animalesVivos; }
        public void setAnimalesVivos(Integer animalesVivos) { this.animalesVivos = animalesVivos; }
        
        public Integer getAnimalesMuertos() { return animalesMuertos; }
        public void setAnimalesMuertos(Integer animalesMuertos) { this.animalesMuertos = animalesMuertos; }
        
        public String getObservaciones() { return observaciones; }
        public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

        @Override
        public String toString() {
            return String.format("AlimentacionRequest{loteId='%s', fecha='%s', cantidad=%.2f, vivos=%d, muertos=%d}", 
                loteId, fecha, cantidadAplicada, animalesVivos, animalesMuertos);
        }
    }
    
    // ========== MÉTODOS AUXILIARES PARA PARSING ==========
    
    /**
     * Extrae el loteId (UUID) desde el campo de observaciones
     * Formato esperado: "... - Lote: UUID | ..." o "Lote: nombre (codigo)"
     */
    private String extraerLoteIdDeObservaciones(String observations) {
        if (observations == null || observations.isEmpty()) {
            return null;
        }
        
        // Patrón para UUID: 8-4-4-4-12 caracteres hex
        Pattern uuidPattern = Pattern.compile("Lote:\\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");
        Matcher matcher = uuidPattern.matcher(observations);
        if (matcher.find()) {
            return matcher.group(1);
        }
        
        // Fallback: buscar cualquier UUID en las observaciones
        Pattern anyUuidPattern = Pattern.compile("([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");
        Matcher anyMatcher = anyUuidPattern.matcher(observations);
        if (anyMatcher.find()) {
            return anyMatcher.group(1);
        }
        
        return null;
    }
    
    /**
     * Extrae el nombre del producto desde el campo de observaciones
     * Formato esperado: "Producto: NombreProducto | ..."
     */
    private String extraerProductoDeObservaciones(String observations) {
        if (observations == null || observations.isEmpty()) {
            return null;
        }
        
        Pattern productoPattern = Pattern.compile("Producto:\\s*([^|]+)");
        Matcher matcher = productoPattern.matcher(observations);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        
        return null;
    }
}
