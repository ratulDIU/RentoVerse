package com.rentoverse.app.service;

import com.rentoverse.app.model.*;
import com.rentoverse.app.repository.BookingRepository;
import com.rentoverse.app.repository.PaymentRepository;
import com.rentoverse.app.repository.RoomRepository;
import com.rentoverse.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.rentoverse.app.model.VisitDecision;


import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepo;
    private final RoomRepository roomRepo;
    private final UserRepository userRepo;
    private final EmailService emailService;
    private final PaymentRepository paymentRepo; // used to avoid expiring when a payment exists

    // ======================= CREATE / RESPOND =======================

    public String createBooking(Long renterId, Long roomId) {
        User renter = userRepo.findById(renterId).orElseThrow();
        Room room = roomRepo.findById(roomId).orElseThrow();

        Booking b = new Booking();
        b.setRenter(renter);
        b.setRoom(room);
        b.setStatus(Status.PENDING_REQUEST);
        bookingRepo.save(b);

        // email provider
        if (room.getProvider() != null && room.getProvider().getEmail() != null) {
            emailService.sendEmail(
                    room.getProvider().getEmail(),
                    "New room booking request",
                    "A renter requested your room “" + room.getTitle() + "”. Please approve/decline in your dashboard."
            );
        }
        return "Booking request sent and provider notified!";
    }

    public String respondBooking(Long bookingId, String action) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        Room room = b.getRoom();
        User renter = b.getRenter();

        if ("approve".equalsIgnoreCase(action)) {
            b.setStatus(Status.AWAITING_PAYMENT);
            b.setApprovedAt(new Date());
            // 3-day payment window
            Date deadline = Date.from(Instant.now().plus(3, ChronoUnit.DAYS));
            b.setPaymentDeadline(deadline);
            // temporarily hide room from public
            if (room != null) {
                room.setAvailable(false);
                roomRepo.save(room);
            }
            bookingRepo.save(b);

            // emails
            if (renter != null) {
                emailService.sendEmail(
                        renter.getEmail(),
                        "Approved — pay 25% within 3 days",
                        "Your booking is approved. Please pay 25% deposit to ADMIN within 3 days to confirm."
                );
            }
            if (room != null && room.getProvider() != null) {
                emailService.sendEmail(
                        room.getProvider().getEmail(),
                        "You approved a booking request",
                        "Please wait for the renter to pay the 25% deposit within the deadline."
                );
            }
            emailService.sendEmail(
                    "contact.rentoverse@gmail.com",
                    "Awaiting 25% deposit",
                    "Booking #" + b.getId() + " needs 25% deposit."
            );
            return "Approved.";
        } else if ("decline".equalsIgnoreCase(action)) {
            b.setStatus(Status.DECLINED);
            bookingRepo.save(b);

            if (renter != null) {
                emailService.sendEmail(
                        renter.getEmail(),
                        "Booking declined",
                        "Sorry, your booking request was declined."
                );
            }
            if (room != null && room.getProvider() != null) {
                emailService.sendEmail(
                        room.getProvider().getEmail(),
                        "You declined a booking",
                        "You declined the renter’s booking request."
                );
            }
            return "Declined.";
        }
        return "Invalid action";
    }

    // ======================= RENTER LISTS =======================

    public List<Booking> getBookingsByRenter(Long renterId) {
        return bookingRepo.findByRenterId(renterId);
    }

    public List<Booking> getPendingBookingsByRenter(Long renterId) {
        return bookingRepo.findByRenterIdAndStatus(renterId, Status.PENDING_REQUEST);
    }

    public List<Booking> getAwaitingPaymentByRenter(Long renterId) {
        return bookingRepo.findByRenterIdAndStatus(renterId, Status.AWAITING_PAYMENT);
    }

    public List<Booking> getPaidConfirmedByRenter(Long renterId) {
        return bookingRepo.findByRenterIdAndStatus(renterId, Status.PAID_CONFIRMED);
    }

    // ======================= PROVIDER LIST =======================

    public List<Booking> getBookingsForProvider(Long providerId) {
        return bookingRepo.findByRoomProviderId(providerId);
    }

    // ======================= CANCEL PENDING =======================

    public String cancelPending(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() != Status.PENDING_REQUEST) {
            return "Only pending can be cancelled.";
        }
        bookingRepo.delete(b);
        return "Cancelled.";
    }

    // ======================= SCHEDULERS =======================

    /**
     * Expire bookings that were approved but the renter didn’t pay in time.
     * IMPORTANT: if there is any PENDING or CONFIRMED payment, we do NOT expire.
     */
    public int expireUnpaidAwaitingPayments() {
        List<Booking> items = bookingRepo.findByStatusAndPaymentDeadlineBefore(Status.AWAITING_PAYMENT, new Date());
        int n = 0;
        for (Booking b : items) {
            boolean hasPayment = paymentRepo.existsByBookingIdAndStatusIn(
                    b.getId(),
                    List.of(PaymentStatus.PENDING, PaymentStatus.CONFIRMED)
            );
            if (hasPayment) {
                // renter has already submitted or got confirmed → skip expiry
                continue;
            }

            b.setStatus(Status.EXPIRED_UNPAID);
            Room r = b.getRoom();
            if (r != null) {
                r.setAvailable(true);
                roomRepo.save(r);
            }
            bookingRepo.save(b);

            // emails
            if (b.getRenter() != null) {
                emailService.sendEmail(
                        b.getRenter().getEmail(),
                        "Booking expired (unpaid)",
                        "You didn’t pay 25% within time. Your booking has expired."
                );
            }
            if (r != null && r.getProvider() != null) {
                emailService.sendEmail(
                        r.getProvider().getEmail(),
                        "Booking expired (renter unpaid)",
                        "The renter did not pay the deposit within time. Room is available again."
                );
            }
            n++;
        }
        return n;
    }

    /**
     * Expire bookings that were confirmed (deposit confirmed) but no visit outcome recorded
     * within the 3-day window.
     */
    public int expireNoVisit() {
        List<Booking> items = bookingRepo.findByStatusAndViewingDeadlineBefore(Status.PAID_CONFIRMED, new Date());
        int n = 0;
        for (Booking b : items) {
            b.setStatus(Status.EXPIRED_NO_VISIT);
            Room r = b.getRoom();
            if (r != null) {
                r.setAvailable(true);
                roomRepo.save(r);
            }
            bookingRepo.save(b);

            // emails
            if (b.getRenter() != null) {
                emailService.sendEmail(
                        b.getRenter().getEmail(),
                        "Booking expired (no visit)",
                        "You didn’t complete the visit within time. Booking expired."
                );
            }
            if (r != null && r.getProvider() != null) {
                emailService.sendEmail(
                        r.getProvider().getEmail(),
                        "Booking expired (no visit)",
                        "The renter did not visit in time. Room is available again."
                );
            }
            n++;
        }
        return n;
    }

    // ======================= ADMIN AFTER-VISIT OPS =======================

    /** Admin marks booking as completed (provider happy, renter liked) */
    public String completeBooking(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        b.setStatus(Status.COMPLETED);
        Room r = b.getRoom();
        if (r != null) {
            r.setAvailable(false); // permanently booked
            roomRepo.save(r);
        }
        bookingRepo.save(b);

        // emails
        if (b.getRenter() != null) {
            emailService.sendEmail(
                    b.getRenter().getEmail(),
                    "Booking completed",
                    "Congrats! Your booking is completed. The provider will proceed with the remaining steps."
            );
        }
        if (r != null && r.getProvider() != null) {
            emailService.sendEmail(
                    r.getProvider().getEmail(),
                    "Booking completed",
                    "The booking has been completed. Please coordinate remaining handover/payment."
            );
        }
        return "Booking completed.";
    }

    /** Admin cancels booking after viewing (renter didn’t proceed) */
    public String cancelAfterViewing(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        b.setStatus(Status.CANCELLED_AFTER_VIEWING);
        Room r = b.getRoom();
        if (r != null) {
            r.setAvailable(true);
            roomRepo.save(r);
        }
        bookingRepo.save(b);

        // emails
        if (b.getRenter() != null) {
            emailService.sendEmail(
                    b.getRenter().getEmail(),
                    "Booking cancelled after viewing",
                    "We’ve cancelled your booking after the viewing. Escrow will be refunded if applicable."
            );
        }
        if (r != null && r.getProvider() != null) {
            emailService.sendEmail(
                    r.getProvider().getEmail(),
                    "Booking cancelled after viewing",
                    "The renter didn’t proceed after viewing. Room is available again."
            );
        }
        return "Booking cancelled after viewing.";
    }

    // ======================= MISC =======================

    public Booking getById(Long id) {
        return bookingRepo.findById(id).orElseThrow();
    }


    public String requestRefundDecision(Long bookingId, String note) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() != Status.PAID_CONFIRMED) {
            return "You can only request refund during the visit window.";
        }
        b.setDecisionStatus(VisitDecision.REFUND_REQUESTED);
        b.setDecisionNote(note);
        bookingRepo.save(b);

        // notify admin
        emailService.sendEmail(
                "contact.rentoverse@gmail.com",
                "Refund requested by renter",
                "Booking #" + b.getId() + " — renter requested a REFUND.\nNote: " + (note == null ? "-" : note)
        );
        return "Refund request placed. Waiting for admin.";
    }

    public String requestCompleteDecision(Long bookingId, String note) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() != Status.PAID_CONFIRMED) {
            return "You can only confirm completion during the visit window.";
        }
        b.setDecisionStatus(VisitDecision.COMPLETE_REQUESTED);
        b.setDecisionNote(note);
        bookingRepo.save(b);

        // notify admin
        emailService.sendEmail(
                "contact.rentoverse@gmail.com",
                "Completion requested by renter",
                "Booking #" + b.getId() + " — renter confirmed they want to complete.\nNote: " + (note == null ? "-" : note)
        );
        return "Completion request placed. Waiting for admin.";
    }

}
