package com.rentoverse.app.dto;
import jakarta.persistence.Column;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    private String email;
    private String code;
    private String newPassword;// <- controller will call getNewPassword()
    @Column(name = "reset_code", length = 6)
    private String resetCode;

    @Column(name = "reset_code_expires_at")
    private LocalDateTime resetCodeExpiresAt;

}