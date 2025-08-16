package com.rentoverse.app.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The booking this payment belongs to */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    /** the booking room-code */
    private String roomCode; // ✅ make sure this exists

    /** Amount paid (expected ~25% of room rent) */
    private Double amount;

    /** Payment method: BKASH / NAGAD / ROCKET / MANUAL, etc. */
    @Column(length = 24)
    private String method;

    /** Free-form reference (we store TXN + ROOM + BK here if needed) */
    @Column(length = 255)
    private String reference;

    // ----------------- NEW optional payer metadata -----------------
    /** Renter’s name at time of payment (optional) */
    @Column(length = 120)
    private String payerName;

    /** Renter’s phone (optional) */
    @Column(length = 32)
    private String payerPhone;

    /** Raw transaction id (optional, also duplicated inside reference) */
    @Column(length = 128)
    private String txnId;

    /** Optional note from renter */
    @Column(length = 512)
    private String note;
    // --------------------------------------------------------------

    /** Use the shared enum in com.rentoverse.app.model */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PaymentStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;

    /** Timestamp when refunded (if refunded) */
    private LocalDateTime refundedAt;

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = PaymentStatus.PENDING;
        }
    }
}
