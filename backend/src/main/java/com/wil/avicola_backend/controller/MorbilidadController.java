package com.wil.avicola_backend.controller;

import com.wil.avicola_backend.model.Enfermedad;
import com.wil.avicola_backend.model.Medicamento;
import com.wil.avicola_backend.model.RegistroMorbilidad;
import com.wil.avicola_backend.model.RegistroMortalidad;
import com.wil.avicola_backend.service.MorbilidadService;
import com.wil.avicola_backend.dto.ConvertirMortalidadDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/morbilidad")
@CrossOrigin(origins = "*")
public class MorbilidadController {

    @Autowired
    private MorbilidadService morbilidadService;

    // ========== OPERACIONES CRUD ==========

    /**
     * Crear nuevo registro de morbilidad
     */
    @PostMapping("/registrar")
    public ResponseEntity<Map<String, Object>> crearRegistro(@RequestBody RegistroMorbilidad registro) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad nuevoRegistro = morbilidadService.crearRegistro(registro);
            response.put("success", true);
            response.put("message", "Registro de morbilidad creado exitosamente");
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
            Optional<RegistroMorbilidad> registro = morbilidadService.obtenerRegistroPorId(id);
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
            List<RegistroMorbilidad> registros = morbilidadService.obtenerTodosLosRegistros();
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
    public ResponseEntity<Map<String, Object>> actualizarRegistro(@PathVariable Long id, @RequestBody RegistroMorbilidad registro) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad registroActualizado = morbilidadService.actualizarRegistro(id, registro);
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
            morbilidadService.eliminarRegistro(id);
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
     * Cambiar estado de tratamiento
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Map<String, Object>> cambiarEstadoTratamiento(@PathVariable Long id, @RequestParam String estado) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad.EstadoTratamiento nuevoEstado = RegistroMorbilidad.EstadoTratamiento.valueOf(estado.toUpperCase());
            RegistroMorbilidad registroActualizado = morbilidadService.cambiarEstadoTratamiento(id, nuevoEstado);
            response.put("success", true);
            response.put("message", "Estado de tratamiento actualizado exitosamente");
            response.put("data", registroActualizado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al cambiar el estado: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Recuperar morbilidad (no altera stock)
     */
    @PatchMapping("/{id}/recuperar")
    public ResponseEntity<Map<String, Object>> recuperar(@PathVariable Long id, @RequestParam(required = false) Double costo) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad actualizado = morbilidadService.recuperar(id, costo);
            response.put("success", true);
            response.put("message", "Registro marcado como RECUPERADO" + (costo != null ? " con costo registrado" : ""));
            response.put("data", actualizado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al recuperar: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Actualizar costo de un registro de morbilidad
     */
    @PatchMapping("/{id}/costo")
    public ResponseEntity<Map<String, Object>> actualizarCosto(@PathVariable Long id, @RequestParam Double costo) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad actualizado = morbilidadService.actualizarCosto(id, costo);
            response.put("success", true);
            response.put("message", "Costo actualizado exitosamente");
            response.put("data", actualizado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al actualizar costo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Convertir a mortalidad (crea registro y descuenta stock)
     */
    @PostMapping("/{id}/convertir-a-mortalidad")
    public ResponseEntity<Map<String, Object>> convertirAMortalidad(@PathVariable Long id, @RequestBody ConvertirMortalidadDTO body) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMortalidad creado = morbilidadService.convertirAMortalidad(id, body);
            response.put("success", true);
            response.put("message", "Registro movido a mortalidad y stock actualizado");
            response.put("data", creado);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al convertir a mortalidad: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Obtener registros por lote
     */
    @GetMapping("/lote/{loteId}")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosPorLote(@PathVariable Long loteId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosPorLote(loteId);
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
     * Obtener registros activos
     */
    @GetMapping("/activos")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosActivos() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosActivos();
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
    public ResponseEntity<Map<String, Object>> obtenerRegistrosPorRangoFechas(@RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fechaInicio,
                                                                              @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fechaFin) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosPorRangoFechas(fechaInicio, fechaFin);
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
     * Obtener registros por estado
     */
    @GetMapping("/estado/{estado}")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosPorEstado(@PathVariable String estado) {
        Map<String, Object> response = new HashMap<>();
        try {
            RegistroMorbilidad.EstadoTratamiento estadoTratamiento = RegistroMorbilidad.EstadoTratamiento.valueOf(estado.toUpperCase());
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosPorEstado(estadoTratamiento);
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
     * Obtener registros que requieren aislamiento
     */
    @GetMapping("/aislamiento")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosQueRequierenAislamiento() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosQueRequierenAislamiento();
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
     * Obtener registros contagiosos
     */
    @GetMapping("/contagiosos")
    public ResponseEntity<Map<String, Object>> obtenerRegistrosContagiosos() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRegistrosContagiosos();
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
     * Obtener revisiones del día
     */
    @GetMapping("/revisiones")
    public ResponseEntity<Map<String, Object>> obtenerRevisionesDelDia(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fecha) {
        Map<String, Object> response = new HashMap<>();
        try {
            LocalDate f = (fecha != null) ? fecha : LocalDate.now();
            List<RegistroMorbilidad> registros = morbilidadService.obtenerRevisionesDelDia(f);
            response.put("success", true);
            response.put("data", registros);
            response.put("count", registros.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener las revisiones: " + e.getMessage());
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
            estadisticas.put("registrosActivos", morbilidadService.obtenerRegistrosActivos().size());
            estadisticas.put("estadisticasPorEnfermedad", morbilidadService.obtenerEstadisticasPorEnfermedad());
            estadisticas.put("estadisticasPorEstado", morbilidadService.obtenerEstadisticasPorEstado());
            estadisticas.put("eficaciaMedicamentos", morbilidadService.obtenerEficaciaMedicamentos());
            estadisticas.put("tendenciaUltimos7Dias", morbilidadService.obtenerTendenciaDiaria(7));
            estadisticas.put("costoTotalTratamientos", morbilidadService.obtenerCostoTotalTratamientos());
            estadisticas.put("registrosAislamiento", morbilidadService.obtenerRegistrosQueRequierenAislamiento().size());
            estadisticas.put("registrosContagiosos", morbilidadService.obtenerRegistrosContagiosos().size());
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
     * Contar enfermos por lote
     */
    @GetMapping("/lote/{loteId}/contar")
    public ResponseEntity<Map<String, Object>> contarEnfermosPorLote(@PathVariable Long loteId) {
        Map<String, Object> response = new HashMap<>();
        try {
            Integer totalEnfermos = morbilidadService.contarEnfermosPorLote(loteId);
            Integer enfermosActivos = morbilidadService.contarEnfermosActivosPorLote(loteId);
            Map<String, Object> datos = new HashMap<>();
            datos.put("totalEnfermos", totalEnfermos);
            datos.put("enfermosActivos", enfermosActivos);
            response.put("success", true);
            response.put("data", datos);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al contar los enfermos: " + e.getMessage());
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
            List<Object[]> tendencia = morbilidadService.obtenerTendenciaDiaria(dias);
            response.put("success", true);
            response.put("data", tendencia);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener la tendencia: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ========== GESTIÓN DE ENFERMEDADES ==========

    /**
     * Obtener todas las enfermedades
     */
    @GetMapping("/enfermedades")
    public ResponseEntity<Map<String, Object>> obtenerEnfermedades() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Enfermedad> enfermedades = morbilidadService.obtenerEnfermedadesActivas();
            response.put("success", true);
            response.put("data", enfermedades);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener las enfermedades: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // ========== GESTIÓN DE MEDICAMENTOS ==========

    /**
     * Obtener todos los medicamentos
     */
    @GetMapping("/medicamentos")
    public ResponseEntity<Map<String, Object>> obtenerMedicamentos() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Medicamento> medicamentos = morbilidadService.obtenerMedicamentosActivos();
            response.put("success", true);
            response.put("data", medicamentos);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener los medicamentos: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}