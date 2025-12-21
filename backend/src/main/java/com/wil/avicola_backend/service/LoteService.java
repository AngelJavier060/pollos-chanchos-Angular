package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

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
import com.wil.avicola_backend.repository.MortalidadRepository;

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
    @Autowired
    private MortalidadRepository mortalidadRepository;

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
        
        // Validación de distribución por sexo para chanchos
        if (lote.getMaleCount() != null || lote.getFemaleCount() != null) {
            int maleCount = lote.getMaleCount() != null ? lote.getMaleCount() : 0;
            int femaleCount = lote.getFemaleCount() != null ? lote.getFemaleCount() : 0;
            
            if (maleCount + femaleCount != lote.getQuantity()) {
                throw new RequestException(
                    "La suma de machos (" + maleCount + ") y hembras (" + femaleCount + 
                    ") debe ser igual a la cantidad total (" + lote.getQuantity() + ")"
                );
            }
            
            if (maleCount < 0 || femaleCount < 0) {
                throw new RequestException("Las cantidades de machos y hembras no pueden ser negativas");
            }
        }
        
        // Generamos el código secuencial según el tipo de animal
        String codigo = codigoLoteService.generarCodigoLote(raza);
        lote.setCodigo(codigo);
        
        // Normalizamos descripción si viene desde frontend
        if (lote.getDescripcion() != null) {
            lote.setDescripcion(lote.getDescripcion().trim());
        }

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
            if (lote.getDescripcion() != null) {
                lote_old.setDescripcion(lote.getDescripcion().trim());
            }
            
            // ✅ MANTENER LA CANTIDAD ORIGINAL - NO SE MODIFICA DESPUÉS DE LA CREACIÓN
            // Solo establecemos quantityOriginal si no existe (para lotes creados antes de esta funcionalidad)
            if (lote_old.getQuantityOriginal() == null && lote.getQuantityOriginal() == null) {
                lote_old.setQuantityOriginal(lote.getQuantity());
            }
            
            // Actualizar campos de distribución por sexo para chanchos (si vienen informados)
            if (lote.getMaleCount() != null) {
                lote_old.setMaleCount(lote.getMaleCount());
            }
            if (lote.getFemaleCount() != null) {
                lote_old.setFemaleCount(lote.getFemaleCount());
            }
            if (lote.getMalePurpose() != null && !lote.getMalePurpose().trim().isEmpty()) {
                lote_old.setMalePurpose(lote.getMalePurpose().trim());
            }
            if (lote.getFemalePurpose() != null && !lote.getFemalePurpose().trim().isEmpty()) {
                lote_old.setFemalePurpose(lote.getFemalePurpose().trim());
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

    // ================= Verificación por lote (vendidos y muertos) =================
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getVerificacionPorLotes(Long animalId, boolean historico) {
        java.util.List<Lote> lotes;
        if (historico) {
            lotes = (animalId == null)
                    ? loteRepository.findByQuantityEquals(0)
                    : loteRepository.findByRaceAnimalIdAndQuantityEquals(animalId, 0);
        } else {
            lotes = (animalId == null)
                    ? loteRepository.findByQuantityGreaterThan(0)
                    : loteRepository.findByRaceAnimalIdAndQuantityGreaterThan(animalId, 0);
        }

        java.util.List<java.util.Map<String, Object>> resp = new java.util.ArrayList<>();
        for (Lote lote : lotes) {
            String loteId = lote.getId();
            long adquiridos;
            {
                Integer qo = lote.getQuantityOriginal();
                adquiridos = (qo != null) ? qo.longValue() : (long) lote.getQuantity();
            }

            java.math.BigDecimal vendidosBD = ventaAnimalRepository.sumCantidadEmitidaByLoteId(loteId);
            long vendidosRaw = (vendidosBD != null) ? vendidosBD.longValue() : 0L;

            Integer muertosInt = mortalidadRepository.countMuertesByLoteId(loteId);
            long muertosRaw = (muertosInt != null) ? muertosInt.longValue() : 0L;

            // Normalización: impedir que vendidos + muertos > adquiridos
            long vendidosCap = Math.max(0L, Math.min(vendidosRaw, adquiridos));
            long maxMuertos = Math.max(0L, adquiridos - vendidosCap);
            long muertosCap = Math.max(0L, Math.min(muertosRaw, maxMuertos));

            java.util.Map<String, Object> item = new java.util.HashMap<>();
            item.put("loteId", loteId);
            item.put("vendidos", vendidosCap);
            item.put("muertos", muertosCap);
            item.put("adquiridos", adquiridos);
            item.put("vivos", lote.getQuantity());
            resp.add(item);
        }
        return ResponseEntity.ok(resp);
    }

    // ================= Reconciliar cantidades (quantity) por lote =================
    public ResponseEntity<java.util.Map<String, Object>> reconciliarCantidades(Long animalId) {
        java.util.List<Lote> lotes;
        if (animalId == null) {
            lotes = new java.util.ArrayList<>();
            loteRepository.findAll().forEach(lotes::add); // CrudRepository#findAll devuelve Iterable
        } else {
            lotes = loteRepository.findByRaceAnimalId(animalId);
        }

        int modificados = 0;
        java.util.List<String> cambiados = new java.util.ArrayList<>();

        for (Lote lote : lotes) {
            String loteId = lote.getId();
            long adquiridos;
            {
                Integer qo = lote.getQuantityOriginal();
                adquiridos = (qo != null) ? qo.longValue() : (long) lote.getQuantity();
            }

            java.math.BigDecimal vendidosBD = ventaAnimalRepository.sumCantidadEmitidaByLoteId(loteId);
            long vendidos = (vendidosBD != null) ? vendidosBD.longValue() : 0L;
            Integer muertosInt = mortalidadRepository.countMuertesByLoteId(loteId);
            long muertos = (muertosInt != null) ? muertosInt.longValue() : 0L;

            if (vendidos < 0) vendidos = 0;
            if (muertos < 0) muertos = 0;
            if (vendidos > adquiridos) vendidos = adquiridos;
            if (muertos > (adquiridos - vendidos)) muertos = (adquiridos - vendidos);

            long vivosCalc = Math.max(0L, adquiridos - vendidos - muertos);
            int vivosCalcInt = (int) Math.max(0L, Math.min((long) Integer.MAX_VALUE, vivosCalc));

            int cantidadAnterior = lote.getQuantity();
            if (cantidadAnterior != vivosCalcInt) {
                lote.setQuantity(vivosCalcInt);
                // actualizar fecha cierre si corresponde
                if (cantidadAnterior > 0 && vivosCalcInt == 0) {
                    lote.setFechaCierre(java.time.LocalDateTime.now());
                } else if (cantidadAnterior == 0 && vivosCalcInt > 0) {
                    lote.setFechaCierre(null);
                }
                loteRepository.save(lote);
                modificados++;
                cambiados.add(loteId);
            }
        }

        java.util.Map<String, Object> res = new java.util.HashMap<>();
        res.put("modificados", modificados);
        res.put("lotes", cambiados);
        return ResponseEntity.ok(res);
    }
}
