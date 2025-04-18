package com.wil.avicola_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.service.AnimalService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Controlador REST para la gestión de animales en el sistema.
 * 
 * Este controlador proporciona endpoints para realizar operaciones CRUD
 * (Crear, Leer, Actualizar, Eliminar) sobre los registros de animales.
 * Todos los endpoints están protegidos y requieren autenticación.
 * 
 * @author Wilson Cayo
 * @version 1.0
 * @since 2025-04-11
 */
@RestController
@RequestMapping("/animal")
@Tag(name = "Animal", description = "API para la gestión de animales")
@CrossOrigin(origins = "*")
public class AnimalController {

    @Autowired
    private AnimalService animalService;

    @Operation(summary = "Obtener todos los animales",
            description = "Recupera una lista de todos los animales registrados en el sistema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista de animales recuperada exitosamente"),
        @ApiResponse(responseCode = "404", description = "No se encontraron animales"),
        @ApiResponse(responseCode = "500", description = "Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<?> findAnimals() {
        return animalService.findAnimals();
    }

    @Operation(summary = "Registrar un nuevo animal",
            description = "Crea un nuevo registro de animal en el sistema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Animal creado exitosamente"),
        @ApiResponse(responseCode = "400", description = "Datos del animal inválidos"),
        @ApiResponse(responseCode = "500", description = "Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<Animal> saveAnimal(
            @Parameter(description = "Datos del animal a crear", required = true)
            @Valid @RequestBody Animal animal) {
        return animalService.saveAnimal(animal);
    }

    @Operation(summary = "Actualizar un animal existente",
            description = "Actualiza los datos de un animal existente en el sistema")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Animal actualizado exitosamente"),
        @ApiResponse(responseCode = "400", description = "Datos del animal inválidos"),
        @ApiResponse(responseCode = "404", description = "Animal no encontrado"),
        @ApiResponse(responseCode = "500", description = "Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<Animal> updateAnimal(
            @Parameter(description = "Datos actualizados del animal", required = true)
            @Valid @RequestBody Animal animal) {
        return animalService.updateAnimal(animal);
    }

    @Operation(summary = "Eliminar un animal",
            description = "Elimina un animal del sistema por su ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Animal eliminado exitosamente"),
        @ApiResponse(responseCode = "404", description = "Animal no encontrado"),
        @ApiResponse(responseCode = "500", description = "Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Animal> deleteAnimal(
            @Parameter(description = "ID del animal a eliminar", required = true)
            @PathVariable long id) {
        return animalService.deleteAnimal(id);
    }
}