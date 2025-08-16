package com.rentoverse.app.service;

import com.rentoverse.app.model.*;
import com.rentoverse.app.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ProviderPayoutService {

    private final BookingRepository bookingRepo;
    private final ProviderPayoutRepository payoutRepo;
    private final EmailService emailService;

    @Transactional
    public ProviderPayout request(Long bookingId, String method, String account, String roomCode) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (b.getStatus() != Status.COMPLETED) {
            throw new IllegalStateException("Payout can be requested only after completion.");
        }
        String providerEmail = b.getRoom() != null && b.getRoom().getProvider() != null
                ? b.getRoom().getProvider().getEmail() : null;

        ProviderPayout p = ProviderPayout.builder()
                .booking(b)
                .providerEmail(providerEmail)
                .roomCode(roomCode)
                .method(method)
                .account(account)
                .status(PayoutStatus.REQUESTED)
                .createdAt(LocalDateTime.now())
                .build();

        ProviderPayout saved = payoutRepo.save(p);

        // optional admin notify
        try {
            emailService.sendEmail(
                    "contact.rentoverse@gmail.com",
                    "Provider payout requested",
                    "Booking #" + b.getId() + " — " + providerEmail + " requested 25% via " + method + " (" + account + ")."
            );
        } catch (Exception ignore) {}

        return saved;
    }

    public ProviderPayout getByBooking(Long bookingId) {
        return payoutRepo.findTopByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("No payout found for booking"));
    }

    @Transactional
    public ProviderPayout markPaid(Long id) {
        ProviderPayout p = payoutRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payout not found"));
        p.setStatus(PayoutStatus.PAID);
        p.setPaidAt(LocalDateTime.now());
        payoutRepo.save(p);

        // notify provider
        try {
            String email = p.getProviderEmail();
            if (email != null) {
                emailService.sendEmail(
                        email,
                        "Payout received — 25% deposit",
                        "Your 25% for booking #" + p.getBooking().getId() + " has been sent.\n\nThank you!"
                );
            }
        } catch (Exception ignore) {}
        return p;
    }
}
