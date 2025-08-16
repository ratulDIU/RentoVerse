package com.rentoverse.app.controller;

import com.rentoverse.app.dto.ResetPasswordRequest;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;                 // <- add this

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordResetController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgot(@RequestParam String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No user for this email"));

        String code = String.format("%06d", new java.util.Random().nextInt(1_000_000));
        user.setResetCode(code);
        user.setResetCodeExpiresAt(LocalDateTime.now().plusMinutes(10));//error in setResetCodeExpiresAt
        userRepository.save(user);

        emailService.sendEmail(email, "Reset your RentoVerse password",
                "Hi " + user.getName() + ",\n\n" +
                        "Your password reset code is: " + code + "\n" +
                        "This code expires in 10 minutes.\n\n" +
                        "If you didn’t request this, you can ignore it.\n");

        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> reset(@RequestBody ResetPasswordRequest body) {
        var user = userRepository.findByEmail(body.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No user for this email"));

        if (user.getResetCode() == null ||
                !user.getResetCode().equals(body.getCode()) ||
                user.getResetCodeExpiresAt() == null ||
                LocalDateTime.now().isAfter(user.getResetCodeExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired code");
        }

        user.setPassword(passwordEncoder.encode(body.getNewPassword()));  // correct getter
        user.setResetCode(null);
        user.setResetCodeExpiresAt(null);
        userRepository.save(user);

        return ResponseEntity.ok().build();
    }
}