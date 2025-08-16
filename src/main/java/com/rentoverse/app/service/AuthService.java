package com.rentoverse.app.service;



import com.rentoverse.app.model.Role;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public String register(User user) {
        if (userRepo.findByEmail(user.getEmail()).isPresent()) {
            return "Email already exists";
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getRole() == null) {
            user.setRole(Role.RENTER);
        }

        userRepo.save(user);
        return "Registration successful";
    }

    public String login(String email, String rawPassword) {
        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty()) return "Invalid email";

        User user = userOpt.get();
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            return "Invalid password";
        }

        return "Login successful as: " + user.getRole();
    }
}
