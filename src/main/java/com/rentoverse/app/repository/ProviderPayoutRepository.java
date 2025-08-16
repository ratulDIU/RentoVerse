package com.rentoverse.app.repository;

import com.rentoverse.app.model.ProviderPayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProviderPayoutRepository extends JpaRepository<ProviderPayout, Long> {
    Optional<ProviderPayout> findTopByBookingIdOrderByCreatedAtDesc(Long bookingId);
}
