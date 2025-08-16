package com.rentoverse.app.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.Date;

@Getter
@Entity
public class SupportTicket {

    @Setter
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    private String name;

    @Setter
    private String email;

    @Setter
    @Enumerated(EnumType.STRING)
    private SupportCategory category;

    @Setter
    private String subject;

    @Setter
    @Column(columnDefinition = "TEXT")
    private String message;

    @Setter
    @Enumerated(EnumType.STRING)
    private TicketStatus status = TicketStatus.OPEN;

    @Setter
    private Long reporterUserId;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = new Date();
        updatedAt = createdAt;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = new Date();
    }
}
