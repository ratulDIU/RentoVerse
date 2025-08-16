package com.rentoverse.app.dto;

public class AuthResponse {
    private String name;
    private String email;
    private String role;
    private Long userId; // ✅ Add this field

    // ✅ Constructor
    public AuthResponse(String name, String email, String role, Long userId) {
        this.name = name;
        this.email = email;
        this.role = role;
        this.userId = userId;
    }

    // ✅ Getters
    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public Long getUserId() {
        return userId;
    }
}
