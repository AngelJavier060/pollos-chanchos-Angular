package com.wil.avicola_backend.service.costos;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.repository.LoteRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class BaseCostosService {
    private final LoteRepository loteRepository;

    public Lote resolveLote(String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) {
            Optional<Lote> opt = loteRepository.findById(loteId);
            if (opt.isPresent()) return opt.get();
        }
        if (loteCodigo != null && !loteCodigo.isBlank()) {
            return loteRepository.findByCodigo(loteCodigo)
                    .orElseThrow(() -> new RequestException("No existe lote con código: " + loteCodigo));
        }
        return null;
    }
}
