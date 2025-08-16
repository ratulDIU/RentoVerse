package com.rentoverse.app.controller;

import com.rentoverse.app.model.ProviderPayout;
import com.rentoverse.app.service.ProviderPayoutService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/provider-payouts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProviderPayoutController {

    private final ProviderPayoutService service;

    /* CREATE: return a flat view instead of the entity (prevents Jackson/Lazy issues) */
    @PostMapping("/request")
    public ResponseEntity<ProviderPayoutView> request(@RequestBody PayoutReq req) {
        ProviderPayout p = service.request(req.getBookingId(), req.getMethod(), req.getAccount(), req.getRoomCode());
        return ResponseEntity.ok(toView(p));
    }

    /* READ: flat view */
    @GetMapping("/by-booking/{bookingId}")
    public ResponseEntity<ProviderPayoutView> byBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(toView(service.getByBooking(bookingId)));
    }

    /* UPDATE: return a simple string so Jackson never serializes the entity */
    @PostMapping("/{id}/mark-paid")
    public ResponseEntity<String> markPaid(@PathVariable Long id) {
        service.markPaid(id);             // updates + emails
        return ResponseEntity.ok("PAID"); // or: return ResponseEntity.noContent().build();
    }

    /* -------- helpers -------- */
    private static ProviderPayoutView toView(ProviderPayout p) {
        ProviderPayoutView v = new ProviderPayoutView();
        v.setId(p.getId());
        v.setBookingId(p.getBooking() != null ? p.getBooking().getId() : null);
        v.setProviderEmail(p.getProviderEmail());
        v.setRoomCode(p.getRoomCode());
        v.setMethod(p.getMethod());
        v.setAccount(p.getAccount());
        v.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        v.setCreatedAt(p.getCreatedAt());
        v.setPaidAt(p.getPaidAt());
        return v;
    }

    @Data
    public static class PayoutReq {
        private Long bookingId;
        private String method;
        private String account;
        private String roomCode;
    }

    @Data
    public static class ProviderPayoutView {
        private Long id;
        private Long bookingId;
        private String providerEmail;
        private String roomCode;
        private String method;
        private String account;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime paidAt;
    }
}
