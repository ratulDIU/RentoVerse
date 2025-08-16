package com.rentoverse.app.controller;



import com.rentoverse.app.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    @Autowired
    private EmailService emailService;

    @PostMapping("/send")
    public String sendTestEmail(@RequestParam String to,
                                @RequestParam String subject,
                                @RequestParam String body) {
        emailService.sendEmail(to, subject, body);
        return "Email sent successfully to " + to;
    }
}

