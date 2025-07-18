package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.model.Race;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.LoteRepository;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

import java.util.HashMap;
import java.util.Map;

@Service
public class CodigoLoteService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private LoteRepository loteRepository;
    
    @Autowired
    private AnimalRepository animalRepository;
    
    // Mapa para almacenar los prefijos por tipo de animal
    private Map<Long, String> prefijosPorAnimal;
    
    // Inicializa los prefijos ya conocidos para mantener la compatibilidad con datos existentes
    @PostConstruct
    public void init() {
        prefijosPorAnimal = new HashMap<>();
        // Prefijos conocidos (compatibilidad con datos existentes)
        prefijosPorAnimal.put(1L, "00"); // Pollo - ID 1
        prefijosPorAnimal.put(2L, "03"); // Cerdo - ID 2
        
        // Obtener todos los animales para inicializar prefijos dinámicamente
        animalRepository.findAll().forEach(animal -> {
            Long animalId = animal.getId();
            // Solo asignar prefijos a animales que aún no tienen uno asignado
            if (!prefijosPorAnimal.containsKey(animalId)) {
                // Generar un prefijo de dos dígitos basado en el ID
                prefijosPorAnimal.put(animalId, String.format("%02d", animalId));
            }
        });
    }

    @Transactional
    public String generarCodigoLote(Race raza) {
        if (raza == null || raza.getAnimal() == null) {
            return generarCodigoGenerico();
        }
        
        Long animalId = raza.getAnimal().getId();
        String prefijo;
        
        // Obtener el prefijo del mapa, si existe, o generar uno nuevo
        if (prefijosPorAnimal.containsKey(animalId)) {
            prefijo = prefijosPorAnimal.get(animalId);
        } else {
            // Si es un animal nuevo, generar prefijo y guardarlo
            prefijo = String.format("%02d", animalId);
            prefijosPorAnimal.put(animalId, prefijo);
        }
        
        // Consulta para obtener el último código con este prefijo
        String jpql = "SELECT l.codigo FROM Lote l WHERE l.codigo LIKE :prefijo ORDER BY l.codigo DESC";
        Query query = entityManager.createQuery(jpql)
                .setParameter("prefijo", prefijo + "%")
                .setMaxResults(1);
        
        String ultimoCodigo = (String) query.getResultList().stream().findFirst().orElse(null);
        
        int secuencia = 1;
        if (ultimoCodigo != null) {
            try {
                // Extraer la parte numérica después del prefijo
                secuencia = Integer.parseInt(ultimoCodigo.substring(2)) + 1;
            } catch (NumberFormatException e) {
                // Si hay un error al parsear, empezamos desde 1
                secuencia = 1;
            }
        }
        
        // Usamos %03d para permitir hasta 999 lotes (total 1000, desde 001 hasta 999)
        // El formato será XXYYY donde XX es el prefijo y YYY es la secuencia
        return String.format("%s%03d", prefijo, secuencia);
    }
    
    private String generarCodigoGenerico() {
        // Código para cuando no se puede identificar el tipo de animal
        String jpql = "SELECT COUNT(l) FROM Lote l";
        Query query = entityManager.createQuery(jpql);
        Long count = (Long) query.getSingleResult();
        return String.format("GEN%04d", count + 1);
    }
}