package com.rentoverse.app.controller;

import com.rentoverse.app.dto.BookingRequestDto;
import com.rentoverse.app.model.Booking;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.BookingService;
import com.rentoverse.app.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final PaymentService paymentService; // kept for legacy /pay-escrow passthrough
    private final UserRepository userRepository;

    // ======================= RENTER: CREATE / CANCEL =======================

    /** Renter → request a booking */
    @PostMapping("/request")
    public ResponseEntity<String> requestBooking(@RequestBody Map<String,String> payload) {
        String renterEmail = payload.get("renterEmail");
        Long roomId = Long.parseLong(payload.get("roomId"));
        User renter = userRepository.findByEmail(renterEmail).orElseThrow();
        return ResponseEntity.ok(bookingService.createBooking(renter.getId(), roomId));
    }

    /** Renter → cancel a pending-request booking */
    @DeleteMapping("/cancel/{id}")
    public ResponseEntity<String> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelPending(id));
    }

    // ======================= PROVIDER: RESPOND =======================

    /** Provider → approve / decline */
    @PostMapping("/respond")
    public ResponseEntity<String> respond(@RequestParam Long bookingId, @RequestParam String action) {
        return ResponseEntity.ok(bookingService.respondBooking(bookingId, action));
    }

    // ======================= RENTER: LISTS =======================

    /** Renter → only pending requests */
    @GetMapping("/pending")
    public List<Booking> pending(@RequestParam String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow();
        return bookingService.getPendingBookingsByRenter(renter.getId());
    }

    /** Renter → all my bookings */
    @GetMapping("/all_by_renter")
    public List<Booking> allByRenter(@RequestParam String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow();
        return bookingService.getBookingsByRenter(renter.getId());
    }

    /** Awaiting list (accepts renterId OR renterEmail) */
    @GetMapping("/awaiting")
    public List<Booking> awaiting(@RequestParam(required = false) Long renterId,
                                  @RequestParam(required = false) String renterEmail) {
        Long id = renterId;
        if (id == null && renterEmail != null) {
            id = userRepository.findByEmail(renterEmail).orElseThrow().getId();
        }
        if (id == null) throw new IllegalArgumentException("renterId or renterEmail is required");
        return bookingService.getAwaitingPaymentByRenter(id);
    }

    /** Renter → bookings in visit window (PAID_CONFIRMED) */
    @GetMapping("/visit")
    public List<Booking> visitList(@RequestParam String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow();
        return bookingService.getPaidConfirmedByRenter(renter.getId());
    }

    // ======================= PROVIDER: DASHBOARD =======================

    /** Provider → see incoming requests */
    @GetMapping("/request_list")
    public List<BookingRequestDto> providerRequests(@RequestParam String email) {
        User provider = userRepository.findByEmail(email).orElseThrow();
        return bookingService.getBookingsForProvider(provider.getId())
                .stream().map(BookingRequestDto::new).collect(Collectors.toList());
    }

    // ======================= LEGACY SUPPORT (optional) =======================
    // You now have PaymentController JSON endpoint. This remains for backward compatibility.

    /** Renter → pay escrow (legacy form-style). Prefer PaymentController JSON endpoint. */
    @PostMapping("/{id}/pay-escrow")
    public ResponseEntity<?> payEscrowLegacy(@PathVariable Long id,
                                             @RequestParam Double amount,
                                             @RequestParam(defaultValue = "MANUAL") String method,
                                             @RequestParam(required = false) String reference,
                                             @RequestParam(required = false) String payerName,
                                             @RequestParam(required = false) String payerPhone,
                                             @RequestParam(required = false) String txnId,
                                             @RequestParam(required = false) String note) {
        return ResponseEntity.ok(
                paymentService.payEscrow(id, amount, method, reference, payerName, payerPhone, txnId, note)
        );
    }

    /** Fetch a booking by id (used by payment.html to show room summary) */
    @GetMapping("/by-id")
    public Booking getById(@RequestParam Long id) {
        return bookingService.getById(id);
    }

    // ======================= ADMIN LEGACY (keep if you still call) =======================
    // Admin confirmation now happens via: POST /api/payments/{paymentId}/confirm in PaymentController.
    // The endpoints below are kept for historical compatibility with your UI.

    /** Admin → finalize after visit (booking-only flow) */
    @PostMapping("/{id}/complete")
    public ResponseEntity<String> complete(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.completeBooking(id));
    }

    /** Admin → refund after viewing (booking-only flow) */
    @PostMapping("/{id}/refund")
    public ResponseEntity<String> refund(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelAfterViewing(id));
    }

    @PostMapping("/{id}/decision")
    public ResponseEntity<String> renterDecision(@PathVariable Long id,
                                                 @RequestParam String action,
                                                 @RequestParam(required = false) String note) {
        switch (action.toUpperCase()) {
            case "REFUND":
                return ResponseEntity.ok(bookingService.requestRefundDecision(id, note));
            case "COMPLETE":
                return ResponseEntity.ok(bookingService.requestCompleteDecision(id, note));
            default:
                return ResponseEntity.badRequest().body("Unknown action. Use REFUND or COMPLETE.");
        }
    }

}
