package com.rentoverse.app.controller;

import com.rentoverse.app.dto.BookingRequestDto;
import com.rentoverse.app.model.Booking;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.BookingService;
import com.rentoverse.app.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/bookings")
// চাইলে এটা উঠিয়ে দিতে পারেন; global CORS থাকলে প্রয়োজন নেই
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final PaymentService paymentService; // legacy support
    private final UserRepository userRepository;

    // ======================= RENTER: CREATE / CANCEL =======================

    /** Renter → request a booking */
    @PostMapping("/request")
    public ResponseEntity<String> requestBooking(@RequestBody Map<String,String> payload) {
        final String renterEmail = payload.get("renterEmail");
        final String roomIdRaw   = payload.get("roomId");
        if (renterEmail == null || roomIdRaw == null) {
            return ResponseEntity.badRequest().body("renterEmail and roomId are required");
        }
        Long roomId = Long.parseLong(roomIdRaw);
        User renter = userRepository.findByEmail(renterEmail).orElseThrow(
                () -> new NoSuchElementException("Renter not found: " + renterEmail)
        );
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
        return ResponseEntity.ok(bookingService.respondBooking(bookingId, action == null ? "" : action.toUpperCase()));
    }

    // ======================= RENTER: LISTS =======================

    /** Renter → only pending requests */
    @GetMapping("/pending")
    public List<Booking> pending(@RequestParam @Email @NotBlank String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow(
                () -> new NoSuchElementException("Renter not found: " + renterEmail)
        );
        return bookingService.getPendingBookingsByRenter(renter.getId());
    }

    /** Renter → all my bookings */
    @GetMapping("/all_by_renter")
    public List<Booking> allByRenter(@RequestParam @Email @NotBlank String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow(
                () -> new NoSuchElementException("Renter not found: " + renterEmail)
        );
        return bookingService.getBookingsByRenter(renter.getId());
    }

    /** Awaiting list (accepts renterId OR renterEmail) */
    @GetMapping("/awaiting")
    public List<Booking> awaiting(@RequestParam(required = false) Long renterId,
                                  @RequestParam(required = false) String renterEmail) {
        Long id = renterId;
        if (id == null && renterEmail != null) {
            id = userRepository.findByEmail(renterEmail).orElseThrow(
                    () -> new NoSuchElementException("Renter not found: " + renterEmail)
            ).getId();
        }
        if (id == null) throw new IllegalArgumentException("renterId or renterEmail is required");
        return bookingService.getAwaitingPaymentByRenter(id);
    }

    /** Renter → bookings in visit window (PAID_CONFIRMED) */
    @GetMapping("/visit")
    public List<Booking> visitList(@RequestParam @Email @NotBlank String renterEmail) {
        User renter = userRepository.findByEmail(renterEmail).orElseThrow(
                () -> new NoSuchElementException("Renter not found: " + renterEmail)
        );
        return bookingService.getPaidConfirmedByRenter(renter.getId());
    }

    // ======================= PROVIDER: DASHBOARD =======================

    /** Provider → see incoming requests */
    @GetMapping("/request_list")
    public List<BookingRequestDto> providerRequests(@RequestParam @Email @NotBlank String email) {
        User provider = userRepository.findByEmail(email).orElseThrow(
                () -> new NoSuchElementException("Provider not found: " + email)
        );
        return bookingService.getBookingsForProvider(provider.getId())
                .stream().map(BookingRequestDto::new).collect(Collectors.toList());
    }

    // ======================= LEGACY SUPPORT (optional) =======================

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
    public ResponseEntity<Booking> getById(@RequestParam Long id) {
        return ResponseEntity.ok(bookingService.getById(id));
    }

    // ======================= ADMIN LEGACY =======================

    @PostMapping("/{id}/complete")
    public ResponseEntity<String> complete(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.completeBooking(id));
    }

    @PostMapping("/{id}/refund")
    public ResponseEntity<String> refund(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.cancelAfterViewing(id));
    }

    @PostMapping("/{id}/decision")
    public ResponseEntity<String> renterDecision(@PathVariable Long id,
                                                 @RequestParam String action,
                                                 @RequestParam(required = false) String note) {
        String normalized = action == null ? "" : action.toUpperCase();
        switch (normalized) {
            case "REFUND":
                return ResponseEntity.ok(bookingService.requestRefundDecision(id, note));
            case "COMPLETE":
                return ResponseEntity.ok(bookingService.requestCompleteDecision(id, note));
            default:
                return ResponseEntity.badRequest().body("Unknown action. Use REFUND or COMPLETE.");
        }
    }

    // ------------------- simple error handlers -------------------

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFound(NoSuchElementException ex) {
        log.warn("Not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}
