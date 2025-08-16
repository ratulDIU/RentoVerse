package com.rentoverse.app.service;

import com.rentoverse.app.dto.PaymentDto;
import com.rentoverse.app.model.*;
import com.rentoverse.app.repository.BookingRepository;
import com.rentoverse.app.repository.PaymentRepository;
import com.rentoverse.app.repository.RoomRepository;
import com.rentoverse.app.repository.ProviderPayoutRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final RoomRepository roomRepository;
    private final EmailService emailService;

    private final ProviderPayoutRepository providerPayoutRepository;

    /** Mailbox for admin notifications */
    @Value("${app.support.email:contact.rentoverse@gmail.com}")
    private String adminEmail;

    // ============================ RENTER: Create PENDING ============================
    @Transactional
    public Payment payEscrow(Long bookingId,
                             double amount,
                             String method,
                             String reference,
                             String payerName,
                             String payerPhone,
                             String txnId,
                             String note) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (booking.getStatus() != Status.AWAITING_PAYMENT) {
            throw new IllegalStateException("Booking is not awaiting payment.");
        }

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(amount)
                .method(method)
                .reference(reference)
                .payerName(payerName)
                .payerPhone(payerPhone)
                .txnId(txnId)
                .note(note)
                .status(PaymentStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        Payment saved = paymentRepository.save(payment);

        // notify admin
        try {
            String subject = "New 25% deposit submitted";
            String body =
                    "Booking #" + booking.getId() + " — 25% submitted\n" +
                            "Room: " + (booking.getRoom() != null ? booking.getRoom().getTitle() : "-") + "\n" +
                            "Method: " + method + "\n" +
                            "Amount: " + amount + "\n" +
                            "TxnId: " + (txnId == null ? "-" : txnId) + "\n" +
                            "Reference: " + (reference == null ? "-" : reference) + "\n" +
                            "Payer: " + (payerName == null ? "-" : payerName) + " (" + (payerPhone == null ? "-" : payerPhone) + ")\n" +
                            "Review in Admin → Payments.";
            emailService.sendEmail(adminEmail, subject, body);
        } catch (Exception ignore) {}

        return saved;
    }

    // ============================ ADMIN: Confirm PENDING → CONFIRMED ============================
    @Transactional
    public Payment confirmPayment(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException("Only PENDING payments can be confirmed.");
        }

        payment.setStatus(PaymentStatus.CONFIRMED);
        payment.setConfirmedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking != null) {
            booking.setStatus(Status.PAID_CONFIRMED);
            booking.setPaymentConfirmedAt(java.util.Date.from(Instant.now()));
            booking.setViewingDeadline(java.util.Date.from(Instant.now().plus(3, ChronoUnit.DAYS)));
            booking.setDecisionStatus(VisitDecision.NONE);
            booking.setDecisionNote(null);
            bookingRepository.save(booking);

            // prevent double booking
            if (booking.getRoom() != null) {
                booking.getRoom().setAvailable(false);
                roomRepository.save(booking.getRoom());
            }

            try {
                if (booking.getRenter() != null) {
                    emailService.sendEmail(
                            booking.getRenter().getEmail(),
                            "Deposit confirmed",
                            "Your 25% deposit is confirmed. Please visit within 3 days."
                    );
                }
                if (booking.getRoom() != null && booking.getRoom().getProvider() != null) {
                    emailService.sendEmail(
                            booking.getRoom().getProvider().getEmail(),
                            "Renter deposit confirmed",
                            "The renter has paid 25% for your room. A 3-day visit window has started."
                    );
                }
            } catch (Exception ignore) {}
        }
        return payment;
    }

    // ============================ ADMIN: Refund (standalone) ============================
    @Transactional
    public Payment refundPayment(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            return payment; // idempotent
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking != null) {
            try {
                if (booking.getRenter() != null) {
                    emailService.sendEmail(
                            booking.getRenter().getEmail(),
                            "Deposit refunded",
                            "Your deposit for booking #" + booking.getId() + " has been refunded."
                    );
                }
                if (booking.getRoom() != null && booking.getRoom().getProvider() != null) {
                    emailService.sendEmail(
                            booking.getRoom().getProvider().getEmail(),
                            "Escrow refund processed",
                            "The renter’s deposit for your room has been refunded."
                    );
                }
            } catch (Exception ignore) {}
        }
        return payment;
    }

    // ============================ ADMIN: Refund & Cancel after visit ============================
    @Transactional
    public PaymentDto refundAndCancel(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        Booking booking = payment.getBooking();
        if (booking == null) throw new IllegalArgumentException("Booking not found for payment");

        if (payment.getStatus() != PaymentStatus.CONFIRMED) {
            throw new IllegalStateException("Refund & cancel requires a CONFIRMED payment.");
        }

        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        booking.setStatus(Status.CANCELLED_AFTER_VIEWING);
        booking.setDecisionStatus(VisitDecision.NONE);
        booking.setDecisionNote(null);
        booking.setViewingDeadline(null);
        booking.setPaymentDeadline(null);
        bookingRepository.save(booking);

        if (booking.getRoom() != null) {
            booking.getRoom().setAvailable(true);
            roomRepository.save(booking.getRoom());
        }

        try {
            if (booking.getRenter() != null) {
                emailService.sendEmail(
                        booking.getRenter().getEmail(),
                        "Deposit refunded & booking cancelled",
                        "Your escrow deposit for booking #" + booking.getId() + " was refunded; booking cancelled."
                );
            }
            if (booking.getRoom() != null && booking.getRoom().getProvider() != null) {
                emailService.sendEmail(
                        booking.getRoom().getProvider().getEmail(),
                        "Booking cancelled after viewing",
                        "The renter didn’t proceed after viewing. Your room is available again."
                );
            }
        } catch (Exception ignore) {}

        return PaymentDto.from(payment);
    }

    // ============================ ADMIN: Complete & Release ============================
    @Transactional
    public PaymentDto completeAndRelease(Long paymentId) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        Booking booking = payment.getBooking();
        if (booking == null) throw new IllegalArgumentException("Booking not found for payment");

        if (payment.getStatus() != PaymentStatus.CONFIRMED) {
            throw new IllegalStateException("Complete & release requires a CONFIRMED payment.");
        }

        booking.setStatus(Status.COMPLETED);
        booking.setDecisionStatus(VisitDecision.NONE);
        booking.setDecisionNote(null);
        bookingRepository.save(booking);

        // keep room occupied
        if (booking.getRoom() != null) {
            booking.getRoom().setAvailable(false);
            roomRepository.save(booking.getRoom());
        }

        try {
            if (booking.getRenter() != null) {
                emailService.sendEmail(
                        booking.getRenter().getEmail(),
                        "Booking completed",
                        "Congrats! Your booking #" + booking.getId() + " is completed."
                );
            }
            if (booking.getRoom() != null && booking.getRoom().getProvider() != null) {
                // updated provider email w/ payout instructions
                emailService.sendEmail(
                        booking.getRoom().getProvider().getEmail(),
                        "Escrow released & booking completed",
                        "Escrow for booking #" + booking.getId() + " has been released.\n\n" +
                                "Next step (for provider):\n" +
                                "• Please open your Provider Dashboard and submit a payout request.\n" +
                                "• Fill in your bKash/Nagad/Rocket number and the Room Code (e.g., RENTO:101).\n" +
                                "• After submission you will see: \"Waiting for admin confirmation\".\n" +
                                "• You will receive a final email as soon as the 25% payout is sent."
                );
            }
        } catch (Exception ignore) {}

        return PaymentDto.from(payment);
    }

    // ============================ LIST for Admin UI (attach provider payout status) ============================
    public List<PaymentDto> listPayments(String status, Long bookingId, String renterEmail) {
        List<Payment> all = paymentRepository.findAll();

        return all.stream()
                .filter(p -> status == null || status.isBlank()
                        || (p.getStatus() != null && p.getStatus().name().equalsIgnoreCase(status)))
                .filter(p -> bookingId == null
                        || (p.getBooking() != null && bookingId.equals(p.getBooking().getId())))
                .filter(p -> {
                    if (renterEmail == null || renterEmail.isBlank()) return true;
                    if (p.getBooking() == null || p.getBooking().getRenter() == null) return false;
                    String email = p.getBooking().getRenter().getEmail();
                    return email != null && email.toLowerCase(Locale.ROOT).contains(renterEmail.toLowerCase(Locale.ROOT));
                })
                .map(p -> {
                    PaymentDto dto = PaymentDto.from(p);
                    if (p.getBooking() != null) {
                        providerPayoutRepository
                                .findTopByBookingIdOrderByCreatedAtDesc(p.getBooking().getId())
                                .ifPresent(pp -> dto.setProviderPayoutStatus(
                                        pp.getStatus() != null ? pp.getStatus().name() : null
                                ));
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
