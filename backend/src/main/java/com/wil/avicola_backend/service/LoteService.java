package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.Race;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.RaceRepository;
import com.wil.avicola_backend.repository.VentaAnimalRepository;

@Service
public class LoteService {

    @Autowired
    private LoteRepository loteRepository;
    @Autowired
    private RaceRepository raceRepository;
    @Autowired
    private CodigoLoteService codigoLoteService;
    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    public ResponseEntity<?> findLotes() {
        return ResponseEntity.ok().body(loteRepository.findAll());
    }

    /**
     * Verifica si ya existe un lote con el mismo nombre para el mismo tipo de animal
     * @param name Nombre del lote a verificar
     * @param animalId ID del animal
     * @return true si ya existe un lote con ese nombre para ese animal, false en caso contrario
     */
    public boolean existsByNameAndAnimalId(String name, long animalId) {
        return loteRepository.existsByNameAndAnimalId(name, animalId);
    }

    public ResponseEntity<Lote> saveLote(long id_race, Lote lote) {
        if (!raceRepository.existsById(id_race)) {
            throw new RequestException("No existe raza.");
        }

        Race raza = raceRepository.findById(id_race).get();
        
        // Verificamos si ya existe un lote con el mismo nombre para este tipo de animal
        if (loteRepository.existsByNameAndAnimalId(lote.getName(), raza.getAnimal().getId())) {
            throw new RequestException("Ya existe un lote con el nombre '" + lote.getName() + "' para este tipo de animal.");
        }
        
        lote.setRace(raza);
        
        // ✅ GUARDAR LA CANTIDAD ORIGINAL AL CREAR EL LOTE
        if (lote.getQuantityOriginal() == null) {
            lote.setQuantityOriginal(lote.getQuantity());
        }
        
        // Generamos el código secuencial según el tipo de animal
        String codigo = codigoLoteService.generarCodigoLote(raza);
        lote.setCodigo(codigo);
        
        Lote lote_new = loteRepository.save(lote);
        return ResponseEntity.status(HttpStatus.OK).body(lote_new);
    }

    public ResponseEntity<Lote> updateLote(Lote lote) {
        if (loteRepository.existsById(lote.getId())) {
            Lote lote_old = loteRepository.findById(lote.getId()).get();
            
            // Si cambió el nombre, verificamos que no exista otro lote con ese nombre para el mismo animal
            if (!lote_old.getName().equals(lote.getName())) {
                long animalId = lote_old.getRace().getAnimal().getId();
                if (loteRepository.existsByNameAndAnimalIdExcludingId(lote.getName(), animalId, lote.getId())) {
                    throw new RequestException("Ya existe otro lote con el nombre '" + lote.getName() + "' para este tipo de animal.");
                }
            }

            lote_old.setBirthdate(lote.getBirthdate());
            lote_old.setCost(lote.getCost());
            lote_old.setName(lote.getName());
            
            // ✅ MANTENER LA CANTIDAD ORIGINAL - NO SE MODIFICA DESPUÉS DE LA CREACIÓN
            // Solo establecemos quantityOriginal si no existe (para lotes creados antes de esta funcionalidad)
            if (lote_old.getQuantityOriginal() == null && lote.getQuantityOriginal() == null) {
                lote_old.setQuantityOriginal(lote.getQuantity());
            }
            
            // Mantenemos el código original, no lo modificamos al actualizar
            // lote_old.setCodigo(lote.getCodigo());

            loteRepository.save(lote_old);
            return ResponseEntity.status(HttpStatus.OK).body(lote_old);
        }
        throw new RequestException("No existe lote.");
    }

    public ResponseEntity<Lote> deleteLote(String id) {
        if (loteRepository.existsById(id)) {
            Lote lote = loteRepository.findById(id).get();
            loteRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(lote);
        }

        throw new RequestException("No existe lote.");
    }
    
    // Método para buscar por código
    public ResponseEntity<Lote> findByCodigo(String codigo) {
        return loteRepository.findByCodigo(codigo)
            .map(lote -> ResponseEntity.ok().body(lote))
            .orElseThrow(() -> new RequestException("No existe lote con el código: " + codigo));
    }

    // ================= Resumen y listados =================
    public ResponseEntity<Map<String, Object>> getResumen(Long animalId) {
        Map<String, Object> data = new HashMap<>();

        long lotesTotales = (animalId == null)
                ? loteRepository.count()
                : loteRepository.countByRaceAnimalId(animalId);

        long lotesActivos = (animalId == null)
                ? loteRepository.countByQuantityGreaterThan(0)
                : loteRepository.countByRaceAnimalIdAndQuantityGreaterThan(animalId, 0);

        long lotesCerrados = (animalId == null)
                ? loteRepository.countByQuantityEquals(0)
                : loteRepository.countByRaceAnimalIdAndQuantityEquals(animalId, 0);

        Long adquiridos = (animalId == null)
                ? loteRepository.sumQuantityOriginal()
                : loteRepository.sumQuantityOriginalByAnimalId(animalId);
        if (adquiridos == null) adquiridos = 0L;

        Long actuales = (animalId == null)
                ? loteRepository.sumQuantity()
                : loteRepository.sumQuantityByAnimalId(animalId);
        if (actuales == null) actuales = 0L;

        BigDecimal vendidosBD = (animalId == null)
                ? ventaAnimalRepository.sumCantidadEmitida()
                : ventaAnimalRepository.sumCantidadEmitidaByAnimalId(animalId);
        long vendidos = vendidosBD != null ? vendidosBD.longValue() : 0L;

        long muertos = Math.max(0L, adquiridos - actuales - vendidos);

        data.put("lotesTotales", lotesTotales);
        data.put("lotesActivos", lotesActivos);
        data.put("lotesCerrados", lotesCerrados);
        data.put("animalesAdquiridos", adquiridos);
        data.put("animalesActuales", actuales);
        data.put("animalesVendidos", vendidos);
        data.put("animalesMuertos", muertos);

        return ResponseEntity.ok(data);
    }

    public ResponseEntity<?> findActivos(Long animalId) {
        if (animalId == null) {
            return ResponseEntity.ok(loteRepository.findByQuantityGreaterThan(0));
        }
        return ResponseEntity.ok(loteRepository.findByRaceAnimalIdAndQuantityGreaterThan(animalId, 0));
    }

    public ResponseEntity<?> findHistorico(Long animalId) {
        if (animalId == null) {
            return ResponseEntity.ok(loteRepository.findByQuantityEquals(0));
        }
        return ResponseEntity.ok(loteRepository.findByRaceAnimalIdAndQuantityEquals(animalId, 0));
    }

    // Histórico por rango de fechas de cierre (opcionalmente por especie)
    public ResponseEntity<?> findHistoricoByFechas(LocalDate desde, LocalDate hasta, Long animalId) {
        // Si no se envían fechas, por defecto últimos 30 días
        LocalDate d = (desde != null) ? desde : LocalDate.now().minusDays(30);
        LocalDate h = (hasta != null) ? hasta : LocalDate.now();
        if (h.isBefore(d)) {
            throw new RequestException("El parámetro 'hasta' no puede ser anterior a 'desde'.");
        }

        LocalDateTime inicio = d.atStartOfDay();
        LocalDateTime fin = h.atTime(LocalTime.MAX);

        if (animalId == null) {
            return ResponseEntity.ok(loteRepository.findHistoricoByFechaCierreBetween(inicio, fin));
        }
        return ResponseEntity.ok(loteRepository.findHistoricoByAnimalAndFechaCierreBetween(animalId, inicio, fin));
    }
}
