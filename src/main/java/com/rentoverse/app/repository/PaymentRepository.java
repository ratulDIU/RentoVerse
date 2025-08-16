package com.rentoverse.app.repository;

import com.rentoverse.app.model.Payment;
import com.rentoverse.app.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingId(Long bookingId);
    List<Payment> findByStatus(PaymentStatus status);
    List<Payment> findByBookingRenterEmail(String email);

    boolean existsByBookingIdAndStatusIn(Long bookingId, Collection<PaymentStatus> statuses);

    // ⬇️ used by PaymentService to avoid races
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);
}
