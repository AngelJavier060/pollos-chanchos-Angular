package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.RaceRepository;

@Service
public class LoteService {

    @Autowired
    private LoteRepository loteRepository;
    @Autowired
    private RaceRepository raceRepository;

    public ResponseEntity<?> findLotes() {
        return ResponseEntity.ok().body(loteRepository.findAll());
    }

    public ResponseEntity<Lote> saveLote(long id_race, Lote lote) {

        if (!raceRepository.existsById(id_race)) {
            throw new RequestException("No existe raza.");
        }

        lote.setRace(raceRepository.findById(id_race).get());
        Lote lote_new = loteRepository.save(lote);
        return ResponseEntity.status(HttpStatus.OK).body(lote_new);
    }

    public ResponseEntity<Lote> updateLote(Lote lote) {

        if (loteRepository.existsById(lote.getId())) {

            Lote lote_old = loteRepository.findById(lote.getId()).get();

            lote_old.setBirthdate(lote.getBirthdate());
            lote_old.setQuantity(lote.getQuantity());
            lote_old.setCost(lote.getCost());

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
}
