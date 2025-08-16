package com.rentoverse.app.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;


import java.util.Date;

@Entity
@Getter
@Setter
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private User renter;

    @ManyToOne(optional = false)
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING_REQUEST;

    /** When request was created */
    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    /** When provider approved */
    @Temporal(TemporalType.TIMESTAMP)
    private Date approvedAt;

    /** Deadline for 25% deposit (approvedAt + 3d) */
    @Temporal(TemporalType.TIMESTAMP)
    private Date paymentDeadline;

    /** When admin confirmed escrow */
    @Temporal(TemporalType.TIMESTAMP)
    private Date paymentConfirmedAt;

    /** Deadline to visit (paymentConfirmedAt + 3d) */
    @Temporal(TemporalType.TIMESTAMP)
    private Date viewingDeadline;

    @PrePersist
    protected void onCreate() {
        this.createdAt = new Date();
    }

    // Renter's post-visit decision (admin will act on it)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisitDecision decisionStatus = VisitDecision.NONE;

    @Column(length = 500)
    private String decisionNote;

//    @PrePersist
//    public void onCreate() {
//        if (decisionStatus == null) decisionStatus = VisitDecision.NONE;
//        // ... keep your existing defaults here ...
//    }


}
