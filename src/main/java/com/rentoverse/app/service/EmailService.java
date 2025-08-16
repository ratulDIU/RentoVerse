package com.rentoverse.app.service;

import com.rentoverse.app.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    // ✅ read from application.properties
    @Value("${spring.mail.username}")
    private String fromAddress;

    public void sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            System.out.println("✅ Email sent to: " + toEmail);
        } catch (MailException e) {
            System.err.println("❌ Failed to send email: " + e.getMessage());
        }
    }

    public void sendRegistrationEmail(String toEmail, String name) {
        String subject = "Welcome to RentoVerse!";
        String body = "Hello " + name + ",\n\nThank you for registering at RentoVerse.\nWe hope you enjoy the experience.\n\nRegards,\nRentoVerse Team";
        sendEmail(toEmail, subject, body);
    }

    public void sendLoginTokenEmail(User user, String token) {
        String subject = "Your RentoVerse Login Token";
        String body = "Hi " + user.getName() + ",\n\nHere is your login token:\n\n" + token +
                "\n\nUse this token to access protected features.";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmail());
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
