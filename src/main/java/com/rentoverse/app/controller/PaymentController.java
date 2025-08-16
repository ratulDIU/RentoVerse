package com.rentoverse.app.controller;

import com.rentoverse.app.dto.PaymentDto;
import com.rentoverse.app.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin/Renter payment endpoints.
 * - List w/ filters (admin)
 * - Confirm / Refund / Refund+Cancel / Complete+Release (admin)
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // -------- LIST (Admin) --------
    @GetMapping
    public ResponseEntity<List<PaymentDto>> list(@RequestParam(required = false) String status,
                                                 @RequestParam(required = false) Long bookingId,
                                                 @RequestParam(required = false) String renterEmail) {
        return ResponseEntity.ok(paymentService.listPayments(status, bookingId, renterEmail));
    }

    // -------- ACTIONS (Admin) --------
    @PostMapping("/{paymentId}/confirm")
    public ResponseEntity<PaymentDto> confirm(@PathVariable Long paymentId) {
        return ResponseEntity.ok(PaymentDto.from(paymentService.confirmPayment(paymentId)));
    }

    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<PaymentDto> refund(@PathVariable Long paymentId) {
        return ResponseEntity.ok(PaymentDto.from(paymentService.refundPayment(paymentId)));
    }

    @PostMapping("/{paymentId}/refund-and-cancel")
    public ResponseEntity<PaymentDto> refundAndCancel(@PathVariable Long paymentId) {
        return ResponseEntity.ok(paymentService.refundAndCancel(paymentId));
    }

    @PostMapping("/{paymentId}/complete-and-release")
    public ResponseEntity<PaymentDto> completeAndRelease(@PathVariable Long paymentId) {
        return ResponseEntity.ok(paymentService.completeAndRelease(paymentId));
    }
}
