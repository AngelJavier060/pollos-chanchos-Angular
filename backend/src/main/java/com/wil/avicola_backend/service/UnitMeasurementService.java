package com.wil.avicola_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.UnitMeasurement;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.UnitMeasurementRepository;

@Service
public class UnitMeasurementService {

    @Autowired
    private UnitMeasurementRepository unitMeasurementRepository;
    @Autowired
    private ProductRepository productRepository;

    public ResponseEntity<?> findUnitMeasurements() {
        return ResponseEntity.ok().body(unitMeasurementRepository.findAll());
    }

    public ResponseEntity<UnitMeasurement> saveUnitMeasurement(UnitMeasurement unitMeasurement) {

        if (unitMeasurementRepository.existsByName(unitMeasurement.getName())) {
            throw new RequestException("Ya existe unidad de medida con el mismo nombre.");
        }

        UnitMeasurement unitMeasurement_new = unitMeasurementRepository.save(unitMeasurement);
        return ResponseEntity.status(HttpStatus.OK).body(unitMeasurement_new);
    }

    public ResponseEntity<UnitMeasurement> updateUnitMeasurement(UnitMeasurement unitMeasurement) {

        if (unitMeasurementRepository.existsById(unitMeasurement.getId())) {
            if (unitMeasurementRepository.existsByNameOther(unitMeasurement.getId(), unitMeasurement.getName())) {
                throw new RequestException("Ya existe unidad de medida con el mismo nombre.");
            }

            UnitMeasurement unitMeasurement_old = unitMeasurementRepository.findById(unitMeasurement.getId()).get();
            unitMeasurement_old.setName(unitMeasurement.getName());
            unitMeasurement_old.setName_short(unitMeasurement.getName_short());
            unitMeasurementRepository.save(unitMeasurement_old);
            return ResponseEntity.status(HttpStatus.OK).body(unitMeasurement_old);
        }
        throw new RequestException("No existe unidad de medida.");
    }

    public ResponseEntity<UnitMeasurement> deleteUnitMeasurement(long id) {

        // Si esta relacionado con producto
        if (productRepository.existsByTypeFood(id)) {
            throw new RequestException(
                    "No puede ser eliminado, existe product(s) registrados con la unidad de medidad.");
        }

        if (unitMeasurementRepository.existsById(id)) {
            UnitMeasurement unitMeasurement = unitMeasurementRepository.findById(id).get();
            unitMeasurementRepository.deleteById(id);
            return ResponseEntity.status(HttpStatus.OK).body(unitMeasurement);
        }

        throw new RequestException("No existe unidad de medida.");
    }
}
