package com.rentoverse.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "rooms")
@Getter
@Setter
// Hibernate lazy proxy fields ignore for JSON
@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String title;                      // getTitle()

    @Column(length = 1000)
    private String description;

    @NotNull
    @Column(nullable = false)
    private Double rent;

    @NotBlank
    @Column(nullable = false, length = 160)
    private String location;

    @Column(length = 60)
    private String type;

    @Column(nullable = false)
    private boolean available = true;          // setAvailable(boolean)

    @Column(length = 500)
    private String imageUrl;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    // User থেকে সংবেদনশীল ফিল্ড বা বড় কালেকশনগুলো বাদ
    @JsonIgnoreProperties({"password","verified","verificationCode","role","bookings","rooms"})
    private User provider;                     // getProvider()

    // ---------- Public room code like "RENTO:10x"
    @Transient
    @JsonProperty("publicCode")
    public String getPublicCode() {
        long base = (id == null ? 0L : id);
        return "RENTO:" + (100 + base);
    }
}
