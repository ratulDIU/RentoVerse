package com.rentoverse.app.controller;

import com.rentoverse.app.model.*;
import com.rentoverse.app.repository.BookingRepository;
import com.rentoverse.app.repository.PaymentRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds renter-facing "Recent Updates" from current booking/payment state.
 * No new tables; purely derived.
 */
@RestController
@RequestMapping("/api/updates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UpdatesController {

    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;

    /**
     * GET /api/updates/renter?email=someone@mail.com
     */
    @GetMapping("/renter")
    public ResponseEntity<List<UpdateItem>> renterUpdates(@RequestParam String email) {
        // All bookings for this renter
        List<Booking> bookings = bookingRepo.findByRenterEmail(email);

        // Only payments for this renter (more efficient than paymentRepo.findAll())
        Map<Long, List<Payment>> paymentsByBooking = paymentRepo.findByBookingRenterEmail(email)
                .stream()
                .filter(p -> p.getBooking() != null)
                .collect(Collectors.groupingBy(p -> p.getBooking().getId()));

        List<UpdateItem> out = new ArrayList<>();

        for (Booking b : bookings) {
            Long bid = b.getId();
            List<Payment> pmts = paymentsByBooking.getOrDefault(bid, Collections.emptyList());

            Payment confirmed = pmts.stream()
                    .filter(p -> p.getStatus() == PaymentStatus.CONFIRMED)
                    .max(Comparator.comparing(Payment::getConfirmedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);

            Payment refunded = pmts.stream()
                    .filter(p -> p.getStatus() == PaymentStatus.REFUNDED)
                    .max(Comparator.comparing(Payment::getRefundedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);

            String code = safeRoomCode(b.getRoom());

            switch (b.getStatus()) {
                case COMPLETED -> {
                    String msg = "✅ Thank you for choosing RentoVerse! Your booking is completed for " + code + ".";
                    out.add(new UpdateItem("SUCCESS", msg, ts(confirmed != null ? confirmed.getConfirmedAt() : null)));
                }
                case CANCELLED_AFTER_VIEWING -> {
                    if (refunded != null) {
                        String msg = "💸 Refund processed for " + code + ". You should receive it within 72 hours.";
                        out.add(new UpdateItem("REFUND", msg, ts(refunded.getRefundedAt())));
                    } else {
                        String msg = "⌛ Refund requested for " + code + ". We’re processing it — you’ll receive it within 72 hours after approval.";
                        out.add(new UpdateItem("PENDING", msg, nowTs()));
                    }
                }
                case PAID_CONFIRMED -> {
                    if (b.getDecisionStatus() == VisitDecision.REFUND_REQUESTED) {
                        out.add(new UpdateItem("PENDING",
                                "↩ You requested a refund for " + code + ". Waiting for admin.",
                                nowTs()));
                    } else if (b.getDecisionStatus() == VisitDecision.COMPLETE_REQUESTED) {
                        out.add(new UpdateItem("PENDING",
                                "✔ You requested completion for " + code + ". Waiting for admin.",
                                nowTs()));
                    }
                }
                default -> { /* no banner */ }
            }

            // Safety: standalone refunded status even if booking wasn't moved
            if (refunded != null && b.getStatus() != Status.CANCELLED_AFTER_VIEWING) {
                out.add(new UpdateItem("REFUND",
                        "💸 Refund processed for " + code + ". You should receive it within 72 hours.",
                        ts(refunded.getRefundedAt())));
            }
        }

        // Sort newest first; null dates last
        out.sort(Comparator.comparing(UpdateItem::getCreatedAt, Comparator.nullsLast(Long::compareTo)).reversed());
        return ResponseEntity.ok(out);
    }

    // In UpdatesController.java
    private static String safeRoomCode(Room r) {
        if (r == null) return "your room";

        // Prefer public code when present
        try {
            String pc = r.getPublicCode();
            if (pc != null && !pc.isBlank()) {
                return pc;
            }
        } catch (NoSuchMethodError ignored) {
            // if Room doesn't have getPublicCode at runtime, just ignore
        }

        // Fallbacks: title, then ID
        if (r.getTitle() != null && !r.getTitle().isBlank()) {
            return r.getTitle();
        }
        Long id = r.getId();
        return (id != null) ? ("ROOM#" + id) : "your room";
    }


    private static Long ts(java.time.LocalDateTime ldt) {
        if (ldt == null) return null;
        return ldt.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private static Long nowTs() {
        return Instant.now().toEpochMilli();
    }

    @Data
    @AllArgsConstructor
    public static class UpdateItem {
        private String type;      // SUCCESS | REFUND | PENDING
        private String message;   // human text
        private Long createdAt;   // epoch ms (nullable)
    }
}
