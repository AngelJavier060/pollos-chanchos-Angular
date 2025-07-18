package com.wil.avicola_backend.repository;

import com.wil.avicola_backend.model.UserSession;
import com.wil.avicola_backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    List<UserSession> findByUserId(Long userId);
    
    Optional<UserSession> findBySessionToken(String token);
    
    List<UserSession> findByUserAndActiveTrue(Usuario user);
    
    Optional<UserSession> findBySessionTokenAndActiveTrue(String token);
    
    @Query("SELECT s FROM UserSession s WHERE s.user.id = :userId AND s.active = true")
    List<UserSession> findActiveSessionsByUserId(@Param("userId") Long userId);

    boolean existsBySessionTokenAndActive(String sessionToken, boolean active);

    @Modifying
    @Query("UPDATE UserSession s SET s.active = false, s.logoutTime = CURRENT_TIMESTAMP WHERE s.user.id = :userId AND s.active = true")
    void deactivateAllUserSessions(@Param("userId") Long userId);
    
    @Query("SELECT s FROM UserSession s WHERE s.lastActivity < :cutoffTime AND s.active = true")
    List<UserSession> findInactiveSessions(@Param("cutoffTime") LocalDateTime cutoffTime);
}
