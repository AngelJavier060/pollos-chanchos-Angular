package com.wil.avicola_backend.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.wil.avicola_backend.dto.GestacionChanchaRequestDto;
import com.wil.avicola_backend.dto.GestacionChanchaResponseDto;
import com.wil.avicola_backend.dto.GestacionPartoRequestDto;
import com.wil.avicola_backend.dto.GestacionPartoResponseDto;
import com.wil.avicola_backend.service.GestacionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/gestacion")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class GestacionController {

    private final GestacionService gestacionService;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<Map<String, Object>> listar() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<GestacionChanchaResponseDto> data = gestacionService.listarTodos();
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al listar gestaciones: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/upload-foto")
    public ResponseEntity<Map<String, Object>> uploadFoto(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "Seleccione una imagen.");
                return ResponseEntity.badRequest().body(response);
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                response.put("success", false);
                response.put("message", "Solo se permiten archivos de imagen.");
                return ResponseEntity.badRequest().body(response);
            }
            if (file.getSize() > 5 * 1024 * 1024) {
                response.put("success", false);
                response.put("message", "La imagen no debe superar 5 MB.");
                return ResponseEntity.badRequest().body(response);
            }

            Path uploadPath = Paths.get(uploadDir, "gestacion");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String original = file.getOriginalFilename();
            String extension = ".jpg";
            if (original != null && original.contains(".")) {
                extension = original.substring(original.lastIndexOf('.')).toLowerCase();
            }
            String fileName = UUID.randomUUID() + extension;
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName));

            String fileUrl = "/uploads/gestacion/" + fileName;
            response.put("success", true);
            response.put("data", fileUrl);
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al subir imagen: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/partos")
    public ResponseEntity<Map<String, Object>> listarPartos(
            @RequestParam(required = false) String loteId,
            @RequestParam(required = false) Integer numeroEnLote) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<GestacionPartoResponseDto> data;
            if (loteId != null && !loteId.isBlank() && numeroEnLote != null) {
                data = gestacionService.listarPartosPorChancha(loteId, numeroEnLote);
            } else {
                data = gestacionService.listarPartos();
            }
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al listar partos: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/siguiente-parto")
    public ResponseEntity<Map<String, Object>> siguienteParto(
            @RequestParam String loteId,
            @RequestParam Integer numeroEnLote) {
        Map<String, Object> response = new HashMap<>();
        try {
            int siguiente = gestacionService.siguienteNumeroParto(loteId, numeroEnLote);
            response.put("success", true);
            response.put("data", siguiente);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{id}/parto")
    public ResponseEntity<Map<String, Object>> registrarParto(
            @PathVariable Long id,
            @RequestBody GestacionPartoRequestDto body) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionPartoResponseDto data = gestacionService.registrarParto(id, body, usuarioActual());
            response.put("success", true);
            response.put("message", "Parto registrado. Ciclo cerrado y cupo liberado.");
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al registrar parto: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/partos/{partoId}")
    public ResponseEntity<Map<String, Object>> obtenerParto(@PathVariable Long partoId) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionPartoResponseDto data = gestacionService.obtenerParto(partoId);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/partos/{partoId}")
    public ResponseEntity<Map<String, Object>> actualizarParto(
            @PathVariable Long partoId,
            @RequestBody GestacionPartoRequestDto body) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionPartoResponseDto data = gestacionService.actualizarParto(partoId, body);
            response.put("success", true);
            response.put("message", "Parto actualizado");
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al actualizar parto: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtener(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionChanchaResponseDto data = gestacionService.obtenerPorId(id);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@RequestBody GestacionChanchaRequestDto body) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionChanchaResponseDto data = gestacionService.crear(body, usuarioActual());
            response.put("success", true);
            response.put("message", "Registro de gestación creado");
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al crear: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizar(
            @PathVariable Long id,
            @RequestBody GestacionChanchaRequestDto body) {
        Map<String, Object> response = new HashMap<>();
        try {
            GestacionChanchaResponseDto data = gestacionService.actualizar(id, body, usuarioActual());
            response.put("success", true);
            response.put("message", "Registro actualizado");
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al actualizar: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> eliminar(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            gestacionService.eliminar(id);
            response.put("success", true);
            response.put("message", "Registro eliminado");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al eliminar: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String usuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null) {
            return auth.getName();
        }
        return "sistema";
    }
}
