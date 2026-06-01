package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.GestacionChanchaRequestDto;
import com.wil.avicola_backend.dto.GestacionChanchaResponseDto;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.RegistroGestacion;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.RegistroGestacionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GestacionService {

    public static final int DIAS_GESTACION = 114;

    private final RegistroGestacionRepository gestacionRepository;
    private final LoteRepository loteRepository;

    public List<GestacionChanchaResponseDto> listarTodos() {
        return gestacionRepository.findAllByOrderByFechaInseminacionDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public GestacionChanchaResponseDto obtenerPorId(Long id) {
        RegistroGestacion reg = gestacionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Registro de gestación no encontrado."));
        return toDto(reg);
    }

    @Transactional
    public GestacionChanchaResponseDto crear(GestacionChanchaRequestDto dto, String usuario) {
        validarRequest(dto);
        Lote lote = cargarLoteValido(dto.getLoteId());
        validarCupoDisponible(lote, dto.getNumeroEnLote(), null);

        boolean activa = dto.getActiva() == null || dto.getActiva();
        RegistroGestacion reg = construirEntidad(dto, lote, activa, usuario);
        return toDto(gestacionRepository.save(reg));
    }

    @Transactional
    public GestacionChanchaResponseDto actualizar(Long id, GestacionChanchaRequestDto dto, String usuario) {
        validarRequest(dto);
        RegistroGestacion reg = gestacionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Registro de gestación no encontrado."));
        Lote lote = cargarLoteValido(dto.getLoteId());

        boolean activa = dto.getActiva() == null || dto.getActiva();
        if (activa) {
            validarCupoDisponible(lote, dto.getNumeroEnLote(), id);
        }

        reg.setLoteId(lote.getId());
        reg.setNumeroEnLote(dto.getNumeroEnLote());
        reg.setNombre(nombreChancha(dto.getNumeroEnLote()));
        reg.setRaza(razaDesdeLote(lote));
        reg.setFechaInseminacion(LocalDate.parse(dto.getFechaInseminacion()));
        reg.setNumeroParto(dto.getNumeroParto() != null && dto.getNumeroParto() > 0 ? dto.getNumeroParto() : 1);
        reg.setObservaciones(dto.getObservaciones());
        reg.setActiva(activa);
        reg.setLoteCodigo(lote.getCodigo());
        reg.setLoteNombre(lote.getName());
        if (usuario != null && !usuario.isBlank()) {
            reg.setUsuarioRegistro(usuario);
        }

        return toDto(gestacionRepository.save(reg));
    }

    @Transactional
    public void eliminar(Long id) {
        if (!gestacionRepository.existsById(id)) {
            throw new IllegalArgumentException("Registro de gestación no encontrado.");
        }
        gestacionRepository.deleteById(id);
    }

    public static String nombreChancha(int numero) {
        return String.format("Chancha-%02d", numero);
    }

    private void validarRequest(GestacionChanchaRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Datos de gestación requeridos.");
        }
        if (dto.getLoteId() == null || dto.getLoteId().isBlank()) {
            throw new IllegalArgumentException("El lote es obligatorio.");
        }
        if (dto.getNumeroEnLote() == null || dto.getNumeroEnLote() <= 0) {
            throw new IllegalArgumentException("El número de chancha en el lote es obligatorio.");
        }
        if (dto.getFechaInseminacion() == null || dto.getFechaInseminacion().isBlank()) {
            throw new IllegalArgumentException("La fecha de inseminación es obligatoria.");
        }
        try {
            LocalDate.parse(dto.getFechaInseminacion());
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha de inseminación inválida. Use formato yyyy-MM-dd.");
        }
    }

    private Lote cargarLoteValido(String loteId) {
        Lote lote = loteRepository.findById(loteId)
                .orElseThrow(() -> new IllegalArgumentException("Lote no encontrado."));
        if (lote.getQuantity() <= 0) {
            throw new IllegalArgumentException("El lote no tiene animales vivos.");
        }
        if (lote.getFechaCierre() != null) {
            throw new IllegalArgumentException("El lote está cerrado.");
        }
        if (!esLoteChancho(lote)) {
            throw new IllegalArgumentException("El lote no corresponde a chanchos/cerdos.");
        }
        return lote;
    }

    private void validarCupoDisponible(Lote lote, int numeroEnLote, Long excluirId) {
        int cupos = cuposHembras(lote);
        int vivas = hembrasVivas(lote);
        if (numeroEnLote > cupos) {
            throw new IllegalArgumentException(
                    "Número de chancha fuera del rango del lote (máximo " + cupos + ").");
        }
        if (numeroEnLote > vivas) {
            throw new IllegalArgumentException(
                    "Chancha no disponible: el lote solo tiene " + vivas + " hembra(s) viva(s).");
        }
        boolean ocupado = excluirId == null
                ? gestacionRepository.existsByLoteIdAndNumeroEnLoteAndActivaTrue(lote.getId(), numeroEnLote)
                : gestacionRepository.existsByLoteIdAndNumeroEnLoteAndActivaTrueAndIdNot(
                        lote.getId(), numeroEnLote, excluirId);
        if (ocupado) {
            throw new IllegalArgumentException("Ya existe una gestación activa para esta chancha en el lote.");
        }
    }

    private RegistroGestacion construirEntidad(
            GestacionChanchaRequestDto dto,
            Lote lote,
            boolean activa,
            String usuario) {
        return RegistroGestacion.builder()
                .loteId(lote.getId())
                .numeroEnLote(dto.getNumeroEnLote())
                .nombre(nombreChancha(dto.getNumeroEnLote()))
                .raza(razaDesdeLote(lote))
                .fechaInseminacion(LocalDate.parse(dto.getFechaInseminacion()))
                .numeroParto(dto.getNumeroParto() != null && dto.getNumeroParto() > 0 ? dto.getNumeroParto() : 1)
                .observaciones(dto.getObservaciones())
                .activa(activa)
                .loteCodigo(lote.getCodigo())
                .loteNombre(lote.getName())
                .usuarioRegistro(usuario)
                .build();
    }

    private boolean esLoteChancho(Lote lote) {
        if (lote.getRace() == null || lote.getRace().getAnimal() == null) {
            return false;
        }
        String n = lote.getRace().getAnimal().getName();
        if (n == null) {
            return lote.getRace().getAnimal().getId() == 2L;
        }
        n = n.toLowerCase();
        return n.contains("chancho") || n.contains("cerdo") || n.contains("porc")
                || lote.getRace().getAnimal().getId() == 2L;
    }

    private int cuposHembras(Lote lote) {
        int hembras = lote.getFemaleCount() != null ? Math.max(0, lote.getFemaleCount()) : 0;
        if (hembras > 0) {
            return hembras;
        }
        return hembrasVivas(lote);
    }

    private int hembrasVivas(Lote lote) {
        int cantidadViva = Math.max(0, lote.getQuantity());
        int hembras = lote.getFemaleCount() != null ? Math.max(0, lote.getFemaleCount()) : 0;
        if (hembras > 0) {
            return Math.min(hembras, cantidadViva);
        }
        return cantidadViva;
    }

    private String razaDesdeLote(Lote lote) {
        if (lote.getRace() != null && lote.getRace().getName() != null) {
            return lote.getRace().getName();
        }
        return null;
    }

    private GestacionChanchaResponseDto toDto(RegistroGestacion reg) {
        return GestacionChanchaResponseDto.builder()
                .id(String.valueOf(reg.getId()))
                .nombre(reg.getNombre())
                .raza(reg.getRaza())
                .fechaInseminacion(reg.getFechaInseminacion().toString())
                .numeroParto(reg.getNumeroParto())
                .observaciones(reg.getObservaciones())
                .loteId(reg.getLoteId())
                .loteCodigo(reg.getLoteCodigo())
                .loteNombre(reg.getLoteNombre())
                .numeroEnLote(reg.getNumeroEnLote())
                .activa(reg.getActiva())
                .build();
    }
}
