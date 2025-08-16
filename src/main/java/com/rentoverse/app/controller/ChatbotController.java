package com.rentoverse.app.controller;

import com.rentoverse.app.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @PostMapping
    public ResponseEntity<String> chat(@RequestBody Map<String, Object> payload) {
        String message = payload.get("message") != null ? payload.get("message").toString() : "";
        String userEmail = payload.get("userEmail") != null ? payload.get("userEmail").toString() : "";
        String userRole = payload.get("userRole") != null ? payload.get("userRole").toString() : "";

        // Final null check to avoid errors
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Message is missing in request.");
        }

        String reply = chatbotService.getReply(message, userEmail, userRole);
        return ResponseEntity.ok(reply);
    }
}
