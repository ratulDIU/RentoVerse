package com.rentoverse.app.controller;

import com.rentoverse.app.dto.SupportDtos;
import com.rentoverse.app.model.SupportTicket;
import com.rentoverse.app.model.TicketStatus;
import com.rentoverse.app.repository.SupportTicketRepository;
import com.rentoverse.app.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class SupportTicketController {

    private final SupportTicketRepository repo;
    private final EmailService emailService;

    @Value("${app.support.email}")
    private String supportInbox;

    public SupportTicketController(SupportTicketRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }

    // ---------- Public: create ticket ----------
    @PostMapping("/support-tickets")
    public SupportDtos.Response create(@Valid @RequestBody SupportDtos.CreateRequest req, Authentication auth) {
        SupportTicket t = new SupportTicket();
        t.setName(req.name);
        t.setEmail(req.email);
        t.setCategory(req.category);
        t.setSubject(req.subject);
        t.setMessage(req.message);

        if (auth != null && auth.getPrincipal() instanceof UserDetails ud) {
            // Optionally set reporterUserId from your user system
            // t.setReporterUserId(...);
        }

        SupportTicket saved = repo.save(t);

        // 1) Notify support inbox
        String staffSubject = "[Support #" + saved.getId() + "] " + saved.getCategory() + " - " + saved.getSubject();
        String staffBody =
                "New Support Ticket\n\n" +
                        "ID: " + saved.getId() + "\n" +
                        "From: " + saved.getName() + " <" + saved.getEmail() + ">\n" +
                        "Category: " + saved.getCategory() + "\n\n" +
                        "Message:\n" + saved.getMessage();
        emailService.sendEmail(supportInbox, staffSubject, staffBody);

        // 2) Auto-acknowledge the user
        String userSubject = "We received your support ticket (#" + saved.getId() + ")";
        String userBody =
                "Hi " + orDash(saved.getName()) + ",\n\n" +
                        "Thanks for contacting RentoVerse support. We've received your ticket.\n" +
                        "Ticket ID: #" + saved.getId() + "\n" +
                        "Category: " + saved.getCategory() + "\n" +
                        "Subject: " + saved.getSubject() + "\n\n" +
                        "Our team will review and get back to you soon.\n\n" +
                        "— RentoVerse Support";
        emailService.sendEmail(saved.getEmail(), userSubject, userBody);

        return toResponse(saved);
    }

    // ---------- Admin: list tickets ----------
    @GetMapping("/admin/support-tickets")
    public List<SupportDtos.Response> list(@RequestParam(required = false) TicketStatus status) {
        var list = (status == null) ? repo.findAll() : repo.findByStatusOrderByCreatedAtDesc(status);
        return list.stream()
                .sorted((a,b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ---------- Admin: update status (also email user about status change) ----------
    @PatchMapping("/admin/support-tickets/{id}/status")
    public SupportDtos.Response setStatus(@PathVariable Long id, @Valid @RequestBody SupportDtos.UpdateStatusRequest req) {
        var t = repo.findById(id).orElseThrow();
        t.setStatus(req.status);
        var saved = repo.save(t);

        // Notify user about new status
        String subject = "Your support ticket (#" + saved.getId() + ") is now " + saved.getStatus();
        String body =
                "Hi " + orDash(saved.getName()) + ",\n\n" +
                        "The status of your RentoVerse support ticket has been updated.\n\n" +
                        "Ticket ID: #" + saved.getId() + "\n" +
                        "New Status: " + saved.getStatus() + "\n" +
                        "Subject: " + saved.getSubject() + "\n\n" +
                        statusHint(saved.getStatus()) + "\n\n" +
                        "If you have more details, just reply to this email.\n\n" +
                        "— RentoVerse Support";
        emailService.sendEmail(saved.getEmail(), subject, body);

        return toResponse(saved);
    }

    private String statusHint(TicketStatus s) {
        return switch (s) {
            case OPEN -> "We opened your ticket and will start reviewing it shortly.";
            case IN_PROGRESS -> "We're actively working on your issue. Thanks for your patience.";
            case RESOLVED -> "We believe this is fixed. If anything remains, reply and we'll reopen.";
            case CLOSED -> "We've closed the ticket. You can reply anytime to reopen if needed.";
        };
    }

    private String orDash(String v) { return (v == null || v.isBlank()) ? "-" : v; }

    private SupportDtos.Response toResponse(SupportTicket t) {
        var df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return new SupportDtos.Response(
                t.getId(), t.getName(), t.getEmail(), t.getCategory(),
                t.getSubject(), t.getMessage(), t.getStatus(), df.format(t.getCreatedAt())
        );
    }
}
