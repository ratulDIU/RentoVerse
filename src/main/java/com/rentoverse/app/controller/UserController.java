package com.rentoverse.app.controller;

import com.rentoverse.app.dto.UserLiteDto;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    // GET /api/users/by-email?email=someone@example.com
    @GetMapping("/by-email")
    public ResponseEntity<?> getByEmail(@RequestParam String email) {
        Optional<User> u = userRepository.findByEmail(email);
        if (u.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = u.get();
        return ResponseEntity.ok(new UserLiteDto(user.getId(), user.getName(), user.getEmail()));
    }
}
