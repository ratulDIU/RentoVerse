package com.rentoverse.app.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderPayout {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Booking booking;

    private String providerEmail;   // denormalized for convenience
    private String roomCode;

    private String method;          // BKASH/NAGAD/ROCKET
    private String account;         // number/account id

    @Enumerated(EnumType.STRING)
    private PayoutStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}
