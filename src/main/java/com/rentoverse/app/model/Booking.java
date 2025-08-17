package com.rentoverse.app.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Entity
@Table(name = "bookings")
@Getter
@Setter
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** who is renting */
    @NotNull
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "renter_id", nullable = false)
    private User renter;

    /** which room is being booked */
    @NotNull
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /** lifecycle status of the booking */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Status status = Status.PENDING_REQUEST;

    /** When request was created */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    /** When provider approved */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "approved_at")
    private Date approvedAt;

    /** Deadline for 25% deposit (approvedAt + 3d) */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "payment_deadline")
    private Date paymentDeadline;

    /** When admin confirmed escrow */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "payment_confirmed_at")
    private Date paymentConfirmedAt;

    /** Deadline to visit (paymentConfirmedAt + 3d) */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "viewing_deadline")
    private Date viewingDeadline;

    /** Renter's post-visit decision (admin will act on it) */
    @Enumerated(EnumType.STRING)
    @Column(name = "decision_status", nullable = false, length = 30)
    private VisitDecision decisionStatus = VisitDecision.NONE;

    @Column(name = "decision_note", length = 500)
    private String decisionNote;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = new Date();
        if (this.status == null) this.status = Status.PENDING_REQUEST;
        if (this.decisionStatus == null) this.decisionStatus = VisitDecision.NONE;
    }
}
