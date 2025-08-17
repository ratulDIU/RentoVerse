package com.rentoverse.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// Hibernate lazy proxy fields ignore for JSON
@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The booking this payment belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    // prevent infinite recursion when serializing a Payment that contains Booking which contains Payments, etc.
    @JsonIgnoreProperties({"payments"})
    private Booking booking;                    // getBooking()

    /** public code of booking/room (optional, for display) */
    @Column(length = 64)
    private String roomCode;

    /** Amount paid (expected ~25% of room rent) */
    @Column(nullable = false)
    private Double amount;

    /** Payment method: BKASH / NAGAD / ROCKET / MANUAL, etc. */
    @Column(length = 24)
    private String method;

    /** Free-form reference (TXN/ROOM/BK etc.) */
    @Column(length = 255)
    private String reference;

    // ----------------- optional payer metadata -----------------
    @Column(length = 120)
    private String payerName;

    @Column(length = 32)
    private String payerPhone;

    @Column(length = 128)
    private String txnId;

    @Column(length = 512)
    private String note;
    // -----------------------------------------------------------

    /** Lifecycle of the payment */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private PaymentStatus status;               // getStatus(), setStatus(PaymentStatus)

    /** Created when row is inserted */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** When admin confirmed escrow */
    private LocalDateTime confirmedAt;          // setConfirmedAt(...)

    /** When refunded (if refunded) */
    private LocalDateTime refundedAt;           // setRefundedAt(...)

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.status == null)    this.status    = PaymentStatus.PENDING;
    }
}
