package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.ConsumoManualRequestDto;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.ConsumoManual;
import com.wil.avicola_backend.model.NombreProducto;
import com.wil.avicola_backend.repository.ConsumoManualRepository;
import com.wil.avicola_backend.repository.NombreProductoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ConsumoManualService {

    private final ConsumoManualRepository consumoManualRepository;
    private final NombreProductoRepository nombreProductoRepository;

    @Transactional
    public ResponseEntity<ConsumoManual> registrarConsumoManual(ConsumoManualRequestDto req, String usuario) {
        if (req == null) throw new RequestException("Solicitud vacía");
        if (req.getLoteId() == null || req.getLoteId().isBlank()) {
            throw new RequestException("loteId es obligatorio");
        }

        // Resolver nombre (configurado o libre)
        NombreProducto nombreProducto = null;
        if (req.getNombreProductoId() != null) {
            nombreProducto = nombreProductoRepository.findById(req.getNombreProductoId())
                .orElseThrow(() -> new RequestException("No existe nombre de producto con ID: " + req.getNombreProductoId()));
        }
        String nombreLibre = req.getNombreLibre() != null ? req.getNombreLibre().trim() : null;
        if (nombreProducto == null && (nombreLibre == null || nombreLibre.isEmpty())) {
            throw new RequestException("Debe especificar nombreProductoId o nombreLibre");
        }

        // Calcular cantidad si no viene
        BigDecimal cantidad = req.getCantidad();
        if ((cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0)
                && req.getCantidadPorAnimal() != null && req.getAnimalesVivos() != null && req.getAnimalesVivos() > 0) {
            cantidad = req.getCantidadPorAnimal().multiply(BigDecimal.valueOf(req.getAnimalesVivos()));
        }
        if (cantidad == null || cantidad.compareTo(new BigDecimal("0.000")) <= 0) {
            throw new RequestException("Cantidad inválida o no especificada");
        }

        // Unidad de medida
        String unidad = req.getUnidadMedida() != null ? req.getUnidadMedida().trim() : null;
        if (unidad == null || unidad.isEmpty()) {
            throw new RequestException("unidadMedida es obligatoria (ej. kg, g, ml, L, unidad)");
        }

        // Costos
        BigDecimal costoUnit = req.getCostoUnitario();
        BigDecimal costoTotal = req.getCostoTotal();
        if (costoTotal == null && costoUnit != null) {
            costoTotal = costoUnit.multiply(cantidad);
        }

        ConsumoManual entity = ConsumoManual.builder()
            .loteId(req.getLoteId())
            .fecha(req.getFecha() != null ? req.getFecha() : LocalDate.now())
            .nombreProducto(nombreProducto)
            .nombreLibre(nombreLibre)
            .unidadMedida(unidad)
            .cantidad(cantidad)
            .costoUnitario(costoUnit)
            .costoTotal(costoTotal)
            .observaciones(req.getObservaciones())
            .usuarioRegistro(usuario != null ? usuario : "API")
            .build();

        ConsumoManual saved = consumoManualRepository.save(entity);
        return ResponseEntity.ok(saved);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<List<ConsumoManual>> listarConsumos(String loteId, LocalDate inicio, LocalDate fin) {
        if (loteId == null || loteId.isBlank()) throw new RequestException("loteId es obligatorio");
        LocalDate i = inicio != null ? inicio : LocalDate.now().minusDays(30);
        LocalDate f = fin != null ? fin : LocalDate.now();
        List<ConsumoManual> lista = consumoManualRepository.findByLoteIdAndFechaBetween(loteId, i, f);
        return ResponseEntity.ok(lista);
    }
}
