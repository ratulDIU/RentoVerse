package com.rentoverse.app.controller;


import com.rentoverse.app.model.User;
import com.rentoverse.app.model.Role;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;



@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // ✅ Step 1: Register user and send verification code
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered.");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setVerified(false);

        // Generate 6-digit code
        String code = String.format("%06d", new Random().nextInt(999999));
        user.setVerificationCode(code);

        if (user.getRole() == null) {
            user.setRole(Role.RENTER);
        }

        userRepository.save(user);

        // ✅ Send code via email
        emailService.sendEmail(user.getEmail(), "Your Verification Code",
                "Hello " + user.getName() + ",\n" +
                        "\n" +
                        "Thank you for registering with us!\n" +
                        "Your verification code is: " +code +"\n" +
                        "\n" +
                        "Please enter this code on the verification page to activate your account.\n" +
                        "\n" +
                        "Regards,  \n" +
                        "Team RentoVerse\n");

        return ResponseEntity.ok("Registration successful. Check your email for the verification code.");
    }

    // ✅ Step 2: Verify using email + code
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@RequestParam String email, @RequestParam String code) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid email.");
        }

        User user = userOpt.get();

        if (user.isVerified()) {
            return ResponseEntity.ok("Already verified.");
        }

        if (user.getVerificationCode().equals(code)) {
            user.setVerified(true);
            user.setVerificationCode(null); // optional
            userRepository.save(user);

            // ✅ Send success email
            emailService.sendEmail(
                    user.getEmail(),
                    "Email Verification Successful",
                    "Hello " + user.getName() + ",\n\nYour email has been successfully verified. Welcome to RentoVerse!. \n\nRegards,\nTeam RentoVerse\n"
            );

            return ResponseEntity.ok("Email verified successfully!");
        } else {
            return ResponseEntity.badRequest().body("Invalid verification code.");
        }
    }

    // ✅ Step 3: Login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser) throws InterruptedException {
        Optional<User> existingUser = userRepository.findByEmail(loginUser.getEmail());

        if (existingUser.isEmpty()) {
            return ResponseEntity.status(401).body("Invalid email");
        }

        User user = existingUser.get();

        if (!passwordEncoder.matches(loginUser.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Invalid password");
        }

        if (!user.isVerified()) {
            return ResponseEntity.status(403).body("Please verify your email before logging in.");
        }

        // ✅ Return name, email, role
        Map<String, String> response = new HashMap<>();
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());
        response.put("userId", String.valueOf(user.getId())); // ✅ Convert Long to String
        return ResponseEntity.ok(response);


    }

}