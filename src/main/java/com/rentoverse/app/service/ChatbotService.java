package com.rentoverse.app.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ChatbotService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    public String getReply(String message, String userEmail, String userRole) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // ✅ Build contextual system prompt
            String prompt = buildPrompt(message, userEmail, userRole);

            // Gemini expects: parts[ { text: "..." } ]
            JSONObject userPart = new JSONObject();
            userPart.put("text", prompt);

            JSONObject content = new JSONObject();
            content.put("role", "user");
            content.put("parts", new JSONArray().put(userPart));

            JSONObject body = new JSONObject();
            body.put("contents", new JSONArray().put(content));

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);

            // Call Gemini API
            ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JSONObject json = new JSONObject(response.getBody());
                return json.getJSONArray("candidates")
                        .getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")
                        .trim();
            }

            return "⚠️ Gemini service returned no valid response.";
        } catch (Exception e) {
            return "⚠️ Gemini AI error: " + e.getMessage();
        }
    }

    // 🧠 Prompt includes clear instruction to stay within RentoVerse domain
    private String buildPrompt(String userPrompt, String userEmail, String userRole) {
        String context = """
        You are RentoBot 🤖, an assistant for a room rental platform called RentoVerse.
        The platform allows:
        - Renters to search and book rooms
        - Providers to post rooms
        - Admins to manage users and listings

        ✳️ Please DO NOT talk about hotels, flights, restaurants, cars, or third-party apps.
        ✳️ Never suggest apps like Booking.com, Airbnb, etc.

        Instead, always respond based on RentoVerse functionality only.

        If the user asks about 'booking', assume they are trying to book a ROOM in RentoVerse.
        If the user asks about 'posting', assume they are trying to post a ROOM as a PROVIDER.

        Be brief, friendly, and helpful.
        
        Context:
        - User Email: %s
        - User Role: %s

        ---
        User: %s
        Assistant:
        """.formatted(userEmail, userRole, userPrompt);

        return context;
    }
}
