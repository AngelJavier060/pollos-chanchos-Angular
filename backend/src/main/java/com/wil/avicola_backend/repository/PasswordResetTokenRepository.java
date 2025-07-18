package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    
    Optional<PasswordResetToken> findByToken(String token);
    
    List<PasswordResetToken> findByUser_Id(Long userId);
    
    List<PasswordResetToken> findByExpiryDateBeforeAndUsedFalse(LocalDateTime now);
}
