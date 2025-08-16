package com.rentoverse.app.controller;

import com.rentoverse.app.model.Role;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAccessController {

    @Value("${admin.secret.key}")
    private String adminSecretKey;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> registerAdmin(@RequestBody User user, @RequestParam String secret) {
        // ✅ Secret key check
        if (!adminSecretKey.equals(secret)) {
            return ResponseEntity.status(401).body("❌ Invalid Admin Secret Key");
        }

        // ✅ Check existing email
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered.");
        }

        // ✅ Set admin-specific values
        user.setRole(Role.ADMIN);
        user.setVerified(false);
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // ✅ Generate 6-digit verification code
        String code = String.format("%06d", new Random().nextInt(999999));
        user.setVerificationCode(code);

        userRepository.save(user);

        // ✅ Send verification email
        emailService.sendEmail(user.getEmail(), "RentoVerse Admin Verification",
                "Hello " + user.getName() + ",\n\n" +
                        "Thanks for registering as an Admin on RentoVerse.\n" +
                        "Your verification code is: " + code + "\n\n" +
                        "Regards,\nTeam RentoVerse");

        return ResponseEntity.ok("✅ Admin registered. Verification code sent to email.");
    }
}
