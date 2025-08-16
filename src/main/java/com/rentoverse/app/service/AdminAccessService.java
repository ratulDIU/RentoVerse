package com.rentoverse.app.service;

import com.rentoverse.app.dto.AdminAccessRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class AdminAccessService {

    @Value("${admin.secret.key}")
    private String configuredSecretKey;



    private final Map<String, String> verificationCodes = new HashMap<>();

    public String requestAccess(AdminAccessRequest request) {
        if (!configuredSecretKey.equals(request.getSecretKey())) {
            return "❌ Invalid secret key!";
        }

        String code = String.valueOf(new Random().nextInt(900000) + 100000);
        verificationCodes.put(request.getEmail(), code);

        // TODO: Use your EmailService to send the code
        // emailService.sendEmail(request.getEmail(), "Your RentoVerse Admin Code", "Your code: " + code);

        return "✅ Verification code sent to: " + request.getEmail();
    }

    public boolean verifyCode(String email, String code) {
        return code.equals(verificationCodes.get(email));
    }

    public void clearCode(String email) {
        verificationCodes.remove(email);
    }
}
