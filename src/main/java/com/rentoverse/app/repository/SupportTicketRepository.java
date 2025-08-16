package com.rentoverse.app.repository;

import com.rentoverse.app.model.SupportTicket;
import com.rentoverse.app.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByEmailOrderByCreatedAtDesc(String email);
    List<SupportTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
}
