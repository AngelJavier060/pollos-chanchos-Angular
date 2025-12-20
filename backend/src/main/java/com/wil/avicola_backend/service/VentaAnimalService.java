package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.VentaAnimalDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.VentaAnimal;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.VentaAnimalRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VentaAnimalService {

    private final VentaAnimalRepository ventaAnimalRepository;
    private final LoteRepository loteRepository;

    @Transactional
    public VentaAnimal crearVenta(VentaAnimalDTO dto, Usuario vendedor) {
        // Validar cantidad como entero no negativo
        int cantidadAnimales = toCantidadEntera(dto.getCantidad());

        // Resolver lote (por UUID o por código)
        Lote lote = resolveLote(dto.getLoteId(), dto.getLoteCodigo());

        // Validar stock suficiente
        if (lote.getQuantity() < cantidadAnimales) {
            throw new RequestException("Stock insuficiente en el lote '" + lote.getCodigo() + "'. Disponible: " + lote.getQuantity() + ", solicitado: " + cantidadAnimales);
        }

        // Descontar stock
        int cantidadAnterior = lote.getQuantity();
        int nuevoStock = cantidadAnterior - cantidadAnimales;
        lote.setQuantity(nuevoStock);
        actualizarFechaCierreLote(lote, cantidadAnterior);
        loteRepository.save(lote);

        BigDecimal total = dto.getTotal();
        if (total == null) {
            total = dto.getPrecioUnit().multiply(dto.getCantidad());
        }

        VentaAnimal venta = VentaAnimal.builder()
                .fecha(dto.getFecha())
                .loteId(lote.getId())
                .loteCodigo(lote.getCodigo())
                .animalId(dto.getAnimalId())
                .animalName(dto.getAnimalName())
                .cantidad(dto.getCantidad())
                .precioUnit(dto.getPrecioUnit())
                .total(total)
                .observaciones(dto.getObservaciones())
                .vendedor(vendedor)
                .build();
        return ventaAnimalRepository.save(venta);
    }

    @Transactional(readOnly = true)
    public List<VentaAnimal> listarPorRango(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return ventaAnimalRepository.findByFechaBetween(from, to);
        }
        if (from != null) {
            return ventaAnimalRepository.findByFecha(from);
        }
        if (to != null) {
            return ventaAnimalRepository.findByFecha(to);
        }
        return ventaAnimalRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<VentaAnimal> listarPorLote(String loteId) {
        return ventaAnimalRepository.findByLoteId(loteId);
    }

    @Transactional(readOnly = true)
    public List<VentaAnimal> listarPorLoteEmitidas(String loteId) {
        return ventaAnimalRepository.findByLoteIdAndEstado(loteId, VentaAnimal.Estado.EMITIDA);
    }

    @Transactional
    public VentaAnimal actualizarVenta(Long id, VentaAnimalDTO dto) {
        VentaAnimal existente = ventaAnimalRepository.findById(id)
                .orElseThrow(() -> new RequestException("venta_animal no encontrada: id=" + id));

        // Calcular ajustes de stock si cambian lote y/o cantidad
        String loteIdAnterior = existente.getLoteId();
        String loteCodigoAnterior = existente.getLoteCodigo();
        int cantidadAnterior = existente.getCantidad() != null ? toCantidadEntera(existente.getCantidad()) : 0;

        String loteIdNuevo = dto.getLoteId() != null ? dto.getLoteId() : loteIdAnterior;
        String loteCodigoNuevo = dto.getLoteCodigo() != null ? dto.getLoteCodigo() : existente.getLoteCodigo();
        Integer cantidadNuevaInt = dto.getCantidad() != null ? toCantidadEntera(dto.getCantidad()) : cantidadAnterior;

        boolean cambioDeLote = (loteIdNuevo != null && !loteIdNuevo.equals(loteIdAnterior)) ||
                               (loteCodigoNuevo != null && loteCodigoAnterior != null && !loteCodigoNuevo.equals(loteCodigoAnterior));

        if (cambioDeLote) {
            // Reponer al lote anterior y descontar del nuevo
            Lote loteAnterior = resolveLote(loteIdAnterior, loteCodigoAnterior);
            int qtyAnteriorLoteAnterior = loteAnterior.getQuantity();
            loteAnterior.setQuantity(qtyAnteriorLoteAnterior + cantidadAnterior);
            actualizarFechaCierreLote(loteAnterior, qtyAnteriorLoteAnterior);
            loteRepository.save(loteAnterior);

            Lote loteNuevo = resolveLote(loteIdNuevo, loteCodigoNuevo);
            if (loteNuevo.getQuantity() < cantidadNuevaInt) {
                throw new RequestException("Stock insuficiente en el lote '" + loteNuevo.getCodigo() + "' para actualizar la venta. Disponible: " + loteNuevo.getQuantity() + ", requerido: " + cantidadNuevaInt);
            }
            int qtyAnteriorLoteNuevo = loteNuevo.getQuantity();
            loteNuevo.setQuantity(qtyAnteriorLoteNuevo - cantidadNuevaInt);
            actualizarFechaCierreLote(loteNuevo, qtyAnteriorLoteNuevo);
            loteRepository.save(loteNuevo);
        } else {
            // Mismo lote: ajustar por diferencia
            int diff = cantidadNuevaInt - cantidadAnterior;
            if (diff != 0) {
                Lote lote = resolveLote(loteIdAnterior, loteCodigoAnterior);
                if (diff > 0) {
                    if (lote.getQuantity() < diff) {
                        throw new RequestException("Stock insuficiente en el lote '" + lote.getCodigo() + "' para aumentar la venta. Disponible: " + lote.getQuantity() + ", requerido: " + diff);
                    }
                    int qtyAnterior = lote.getQuantity();
                    lote.setQuantity(qtyAnterior - diff);
                    actualizarFechaCierreLote(lote, qtyAnterior);
                } else {
                    // diff < 0, devolver stock
                    int qtyAnterior = lote.getQuantity();
                    lote.setQuantity(qtyAnterior + Math.abs(diff));
                    actualizarFechaCierreLote(lote, qtyAnterior);
                }
                loteRepository.save(lote);
            }
        }

        // Actualizar campos de la venta
        if (dto.getFecha() != null) existente.setFecha(dto.getFecha());
        if (dto.getLoteId() != null) existente.setLoteId(loteIdNuevo);
        if (dto.getLoteCodigo() != null) existente.setLoteCodigo(loteCodigoNuevo);
        if (dto.getAnimalId() != null) existente.setAnimalId(dto.getAnimalId());
        if (dto.getAnimalName() != null) existente.setAnimalName(dto.getAnimalName());
        if (dto.getCantidad() != null) existente.setCantidad(dto.getCantidad());
        if (dto.getPrecioUnit() != null) existente.setPrecioUnit(dto.getPrecioUnit());

        BigDecimal total = dto.getTotal();
        if (total == null && existente.getPrecioUnit() != null && existente.getCantidad() != null) {
            total = existente.getPrecioUnit().multiply(existente.getCantidad());
        }
        if (total != null) existente.setTotal(total);

        if (dto.getObservaciones() != null) existente.setObservaciones(dto.getObservaciones());

        return ventaAnimalRepository.saveAndFlush(existente);
    }

    @Transactional
    public void eliminarVenta(Long id) {
        VentaAnimal venta = ventaAnimalRepository.findById(id)
                .orElseThrow(() -> new RequestException("venta_animal no encontrada: id=" + id));

        // Si estaba emitida, reponer stock antes de eliminar
        if (venta.getEstado() == VentaAnimal.Estado.EMITIDA) {
            Lote lote = resolveLote(venta.getLoteId(), venta.getLoteCodigo());
            int cant = venta.getCantidad() != null ? toCantidadEntera(venta.getCantidad()) : 0;
            int qtyAnterior = lote.getQuantity();
            lote.setQuantity(qtyAnterior + cant);
            actualizarFechaCierreLote(lote, qtyAnterior);
            loteRepository.save(lote);
        }

        ventaAnimalRepository.deleteById(id);
    }

    @Transactional
    public VentaAnimal anularVenta(Long id) {
        VentaAnimal venta = ventaAnimalRepository.findById(id)
                .orElseThrow(() -> new RequestException("venta_animal no encontrada: id=" + id));

        if (venta.getEstado() == VentaAnimal.Estado.EMITIDA) {
            // Reponer stock
            Lote lote = resolveLote(venta.getLoteId(), venta.getLoteCodigo());
            int cant = venta.getCantidad() != null ? toCantidadEntera(venta.getCantidad()) : 0;
            int qtyAnterior = lote.getQuantity();
            lote.setQuantity(qtyAnterior + cant);
            actualizarFechaCierreLote(lote, qtyAnterior);
            loteRepository.save(lote);

            // Marcar como anulada
            venta.setEstado(VentaAnimal.Estado.ANULADA);
        }
        return ventaAnimalRepository.saveAndFlush(venta);
    }

    // ===== Helpers =====
    private int toCantidadEntera(BigDecimal cantidad) {
        if (cantidad == null) return 0;
        try {
            return cantidad.intValueExact();
        } catch (ArithmeticException ex) {
            throw new RequestException("La cantidad de animales debe ser un número entero.");
        }
    }

    private Lote resolveLote(String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) {
            Optional<Lote> opt = loteRepository.findById(loteId);
            if (opt.isPresent()) return opt.get();
        }
        if (loteCodigo != null && !loteCodigo.isBlank()) {
            return loteRepository.findByCodigo(loteCodigo)
                    .orElseThrow(() -> new RequestException("No existe lote con código: " + loteCodigo));
        }
        throw new RequestException("No se pudo resolver el lote (ID o código no provistos válidamente)");
    }

    private void actualizarFechaCierreLote(Lote lote, int cantidadAnterior) {
        int cantidadActual = lote.getQuantity();
        if (cantidadAnterior > 0 && cantidadActual == 0) {
            lote.setFechaCierre(LocalDateTime.now());
        } else if (cantidadAnterior == 0 && cantidadActual > 0) {
            lote.setFechaCierre(null);
        }
    }
}
