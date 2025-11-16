package com.wil.avicola_backend.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "subcategory", uniqueConstraints = {
    @UniqueConstraint(name = "uk_subcategory_name_typefood", columnNames = {"type_food_id", "name"})
})
public class Subcategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Por favor, ingrese nombre de la subcategoría.")
    @Column(nullable = false)
    private String name;

    @Column(length = 500)
    private String description;

    @NotNull(message = "La categoría padre es obligatoria.")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_food_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private TypeFood typeFood;

    // Acceso directo al valor del FK (no actualizable) para evitar inicializaciones
    @Column(name = "type_food_id", insertable = false, updatable = false)
    private Long typeFoodIdRaw;

    @Column(name = "category_id")
    private Long legacyCategoryId;

    @PrePersist
    @PreUpdate
    private void syncLegacyCategory() {
        // Mantener la columna legacy en NULL para evitar violaciones de FK hacia 'category'
        this.legacyCategoryId = null;
    }

    @CreatedDate
    @Column(name = "create_date")
    private LocalDateTime createDate;

    @LastModifiedDate
    @Column(name = "update_date")
    private LocalDateTime updateDate;
}
