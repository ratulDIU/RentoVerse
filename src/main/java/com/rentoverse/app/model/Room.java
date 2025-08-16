package com.rentoverse.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    private double rent;
    private String location;
    private String type;
    private boolean available = true;
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    @JsonIgnoreProperties({"password", "verified", "verificationCode", "role", "bookings", "rooms"})
    private User provider;

    // ---------- Public room code like "RENTO:10x"
    @Transient
    @JsonProperty("publicCode")
    public String getPublicCode() {
        long base = (id == null ? 0L : id);
        return "RENTO:" + (100 + base);
    }
}
