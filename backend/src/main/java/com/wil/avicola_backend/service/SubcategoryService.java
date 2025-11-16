package com.wil.avicola_backend.service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Subcategory;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.repository.SubcategoryRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;

@Service
public class SubcategoryService {

    private static final Logger logger = LoggerFactory.getLogger(SubcategoryService.class);

    @Autowired
    private SubcategoryRepository subcategoryRepository;
    @Autowired
    private TypeFoodRepository typeFoodRepository;

    public ResponseEntity<?> findAll() {
        logger.debug("[SubcategoryService] findAll: consultando subcategorías");
        // Cargar todas las subcategorías SIN join fetch
        List<Subcategory> list = subcategoryRepository.findAll();
        // Construir mapa id->name para TypeFood una sola vez
        Map<Long, String> tfMap = new HashMap<>();
        for (TypeFood tf : typeFoodRepository.findAll()) {
            tfMap.put(tf.getId(), tf.getName());
        }
        list.sort(
            Comparator.comparing(
                (Subcategory s) -> categoryName(s, tfMap),
                String.CASE_INSENSITIVE_ORDER
            ).thenComparing(
                s -> s.getName() == null ? "" : s.getName(),
                String.CASE_INSENSITIVE_ORDER
            )
        );
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<?> findByCategory(Long typeFoodId) {
        return ResponseEntity.ok(subcategoryRepository.findAllByTypeFoodIdOrderByNameAsc(typeFoodId));
    }

    public ResponseEntity<Subcategory> create(Subcategory s) {
        validarTypeFood(s.getTypeFood());
        Long typeFoodId = s.getTypeFood().getId();
        if (subcategoryRepository.existsByTypeFoodIdAndNameIgnoreCase(typeFoodId, s.getName())) {
            throw new RequestException("Ya existe una subcategoría con ese nombre en la categoría seleccionada.");
        }
        Subcategory saved = subcategoryRepository.save(s);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    public ResponseEntity<Subcategory> update(Long id, Subcategory s) {
        validarTypeFood(s.getTypeFood());
        if (!subcategoryRepository.existsById(id)) {
            throw new RequestException("No existe subcategoría.");
        }
        Long typeFoodId = s.getTypeFood().getId();
        if (subcategoryRepository.existsByTypeFoodIdAndNameIgnoreCaseAndIdNot(typeFoodId, s.getName(), id)) {
            throw new RequestException("Ya existe una subcategoría con ese nombre en la categoría seleccionada.");
        }
        s.setId(id);
        Subcategory updated = subcategoryRepository.save(s);
        return ResponseEntity.ok(updated);
    }

    public ResponseEntity<?> delete(Long id) {
        if (!subcategoryRepository.existsById(id)) {
            throw new RequestException("No existe subcategoría.");
        }
        // En el futuro: validar referencias con Product u otras entidades
        subcategoryRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    public ResponseEntity<?> groupedByCategory() {
        logger.debug("[SubcategoryService] groupedByCategory: consultando subcategorías");
        List<Subcategory> list = subcategoryRepository.findAll();
        Map<Long, String> tfMap = new HashMap<>();
        for (TypeFood tf : typeFoodRepository.findAll()) {
            tfMap.put(tf.getId(), tf.getName());
        }
        Map<String, List<Map<String, Object>>> grouped = list.stream()
            .sorted(
                Comparator.comparing(
                    (Subcategory s) -> categoryName(s, tfMap),
                    String.CASE_INSENSITIVE_ORDER
                ).thenComparing(
                    s -> s.getName() == null ? "" : s.getName(),
                    String.CASE_INSENSITIVE_ORDER
                )
            )
            .collect(Collectors.groupingBy(
                s -> categoryName(s, tfMap),
                LinkedHashMap::new,
                Collectors.mapping(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", s.getId());
                    m.put("name", s.getName());
                    m.put("description", s.getDescription());
                    Long tid = s.getTypeFoodIdRaw();
                    String tname = tid != null ? tfMap.get(tid) : null;
                    Map<String, Object> cat = new HashMap<>();
                    cat.put("id", tid);
                    cat.put("name", (tname == null || tname.isBlank()) ? "Sin categoría" : tname);
                    // Compatibilidad para el frontend
                    m.put("typeFood", cat);
                    m.put("category", cat);
                    return m;
                }, Collectors.toList())
            ));
        return ResponseEntity.ok(grouped);
    }

    private String categoryName(Subcategory s, Map<Long, String> tfMap) {
        if (s == null) return "Sin categoría";
        Long id = s.getTypeFoodIdRaw();
        String name = (id != null) ? tfMap.get(id) : null;
        return (name == null || name.trim().isEmpty()) ? "Sin categoría" : name;
    }

    private void validarTypeFood(TypeFood typeFood) {
        if (typeFood == null || typeFood.getId() == 0) {
            throw new RequestException("La categoría padre es obligatoria.");
        }
        if (!typeFoodRepository.existsById(typeFood.getId())) {
            throw new RequestException("La categoría especificada no existe.");
        }
    }
}
