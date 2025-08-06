package com.wil.avicola_backend.controller;

import com.wil.avicola_backend.model.CausaMortalidad;
import com.wil.avicola_backend.model.RegistroMortalidad;
import com.wil.avicola_backend.service.MortalidadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mortalidad")
@CrossOrigin(origins = "*")
public class MortalidadController {
    
    @Autowired
    private MortalidadService mortalidadService;
    
    // ========== OPERACIONES CRUD ==========
    
    /**
     * Crear nuevo registro de mortalidad
     */
    @PostMapping("/registrar")
    public ResponseEntity<Map<String, Object>> crearRegistro(@RequestBody RegistroMortalidad registro) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMortalidad nuevoRegistro = mortalidadService.crearRegistro(registro);
            response.put("success", true);
            response.put("message", "Registro de mortalidad creado exitosamente");
            response.put("data", nuevoRegistro);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al crear el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Crear nuevo registro de mortalidad con causaId
     */
    @PostMapping("/registrar-con-causa")
    public ResponseEntity<Map<String, Object>> crearRegistroConCausaId(@RequestBody Map<String, Object> requestData) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Extraer datos del request
            RegistroMortalidad registro = new RegistroMortalidad();
            registro.setLoteId((String) requestData.get("loteId"));
            registro.setCantidadMuertos((Integer) requestData.get("cantidadMuertos"));
            registro.setObservaciones((String) requestData.get("observaciones"));
            registro.setEdad((Integer) requestData.get("edad"));
            registro.setUbicacion((String) requestData.get("ubicacion"));
            registro.setConfirmado((Boolean) requestData.get("confirmado"));
            registro.setUsuarioRegistro((String) requestData.get("usuarioRegistro"));
            
            Long causaId = Long.valueOf(requestData.get("causaId").toString());
            
            RegistroMortalidad nuevoRegistro = mortalidadService.crearRegistroConCausaId(registro, causaId);
            response.put("success", true);
            response.put("message", "Registro de mortalidad creado exitosamente");
            response.put("data", nuevoRegistro);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al crear el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener registro por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerRegistroPorId(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<RegistroMortalidad> registro = mortalidadService.obtenerRegistroPorId(id);
            if (registro.isPresent()) {
                response.put("success", true);
                response.put("data", registro.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Registro no encontrado");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener todos los registros
     */
    @GetMapping("/registros")
    public ResponseEntity<Map<String, Object>> obtenerTodosLosRegistros() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMortalidad> registros = mortalidadService.obtenerTodosLosRegistros();
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los registros: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Actualizar registro
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarRegistro(@PathVariable Long id, @RequestBody RegistroMortalidad registro) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMortalidad registroActualizado = mortalidadService.actualizarRegistro(id, registro);
            response.put("success", true);
            response.put("message", "Registro actualizado exitosamente");
            response.put("data", registroActualizado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al actualizar el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Eliminar registro
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminarRegistro(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            mortalidadService.eliminarRegistro(id);
            response.put("success", true);
            response.put("message", "Registro eliminado exitosamente");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al eliminar el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Confirmar registro
     */
    @PatchMapping("/{id}/confirmar")
    public ResponseEntity<Map<String, Object>> confirmarRegistro(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMortalidad registroConfirmado = mortalidadService.confirmarRegistro(id);
            response.put("success", true);
            response.put("message", "Registro confirmado exitosamente");
            response.put("data", registroConfirmado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al confirmar el registro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // ========== CONSULTAS ESPECÍFICAS ==========
    
    /**
     * Obtener registros por lote
     */
    @GetMapping("/lote/{loteId}")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosPorLote(@PathVariable String loteId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMortalidad> registros = mortalidadService.obtenerRegistrosPorLote(loteId);
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los registros: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener registros por rango de fechas
     */
    @GetMapping("/rango-fechas")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosPorRangoFechas(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime fechaInicio,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime fechaFin) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMortalidad> registros = mortalidadService.obtenerRegistrosPorRangoFechas(fechaInicio, fechaFin);
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los registros: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener registros no confirmados
     */
    @GetMapping("/no-confirmados")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosNoConfirmados() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMortalidad> registros = mortalidadService.obtenerRegistrosNoConfirmados();
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los registros: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener registros recientes
     */
    @GetMapping("/recientes")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosRecientes() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMortalidad> registros = mortalidadService.obtenerRegistrosRecientes();
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los registros: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // ========== ESTADÍSTICAS ==========
    
    /**
     * Obtener estadísticas generales
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas() {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> estadisticas = new HashMap<>();
            
            // Mortalidad del día
            estadisticas.put("mortalidadHoy", mortalidadService.obtenerMortalidadHoy());
            
            // Estadísticas por causa
            estadisticas.put("estadisticasPorCausa", mortalidadService.obtenerEstadisticasPorCausa());
            
            // Tendencia últimos 7 días
            estadisticas.put("tendenciaUltimos7Dias", mortalidadService.obtenerTendenciaDiaria(7));
            
            // Registros no confirmados
            estadisticas.put("registrosNoConfirmados", mortalidadService.obtenerRegistrosNoConfirmados().size());
            
            response.put("success", true);
            response.put("data", estadisticas);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener las estadísticas: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Contar muertes por lote
     */
    @GetMapping("/lote/{loteId}/contar")
    public ResponseEntity<Map<String, Object>> contarMuertesPorLote(@PathVariable String loteId) {
        Map<String, Object> response = new HashMap<>();
        try {
            Integer totalMuertes = mortalidadService.contarMuertesPorLote(loteId);
            response.put("success", true);
            response.put("data", totalMuertes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al contar las muertes: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Obtener tendencia diaria
     */
    @GetMapping("/tendencia/{dias}")
    public ResponseEntity<Map<String, Object>> obtenerTendenciaDiaria(@PathVariable int dias) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Object[]> tendencia = mortalidadService.obtenerTendenciaDiaria(dias);
            response.put("success", true);
            response.put("data", tendencia);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener la tendencia: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    // ========== GESTIÓN DE CAUSAS ==========
    
    /**
     * Obtener todas las causas
     */
    @GetMapping("/causas")
    public ResponseEntity<Map<String, Object>> obtenerCausas() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<CausaMortalidad> causas = mortalidadService.obtenerCausasActivas();
            response.put("success", true);
            response.put("data", causas);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener las causas: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * Crear nueva causa
     */
    @PostMapping("/causas")
    public ResponseEntity<Map<String, Object>> crearCausa(@RequestBody CausaMortalidad causa) {
        Map<String, Object> response = new HashMap<>();
        try {
            CausaMortalidad nuevaCausa = mortalidadService.crearCausa(causa);
            response.put("success", true);
            response.put("message", "Causa creada exitosamente");
            response.put("data", nuevaCausa);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al crear la causa: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
} 