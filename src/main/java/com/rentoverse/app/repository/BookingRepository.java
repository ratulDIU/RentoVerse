package com.rentoverse.app.repository;

import com.rentoverse.app.model.Booking;
import com.rentoverse.app.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByRenterId(Long renterId);
    List<Booking> findByRenterIdAndStatus(Long renterId, Status status);
    List<Booking> findByRoomProviderId(Long providerId);
    List<Booking> findByRenterEmail(String email);


    // for schedulers
    List<Booking> findByStatusAndPaymentDeadlineBefore(Status status, Date now);
    List<Booking> findByStatusAndViewingDeadlineBefore(Status status, Date now);
}
