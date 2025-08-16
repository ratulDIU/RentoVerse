package com.rentoverse.app.dto;

import com.rentoverse.app.model.Booking;
import com.rentoverse.app.model.Payment;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Date;

@Data
public class PaymentDto {
    private Long id;
    private Long bookingId;
    private String renterEmail;

    private Double amount;
    private String method;
    private String reference;

    private String payerName;
    private String payerPhone;
    private String roomCode;
    private String txnId;
    private String note;

    /** Payment status as String for easier JSON handling */
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime refundedAt;

    /** Booking windows */
    private Date paymentDeadline;
    private Date viewingDeadline;

    /** Renter decision during visit window */
    private String decisionStatus;   // NONE / REFUND_REQUESTED / COMPLETE_REQUESTED
    private String decisionNote;

    /** NEW: current booking status (e.g., COMPLETED, CANCELLED_AFTER_VIEWING, etc.) */
    private String bookingStatus;

    /** Provider payout status for admin table (REQUESTED / PAID / REJECTED) */
    private String providerPayoutStatus;

    public static PaymentDto from(Payment p) {
        PaymentDto dto = new PaymentDto();
        dto.setId(p.getId());

        Booking b = p.getBooking();
        dto.setBookingId(b != null ? b.getId() : null);
        dto.setRenterEmail(b != null && b.getRenter() != null ? b.getRenter().getEmail() : null);

        dto.setAmount(p.getAmount());
        dto.setMethod(p.getMethod());
        dto.setReference(p.getReference());

        dto.setPayerName(p.getPayerName());
        dto.setPayerPhone(p.getPayerPhone());
        dto.setRoomCode(p.getRoomCode());
        dto.setTxnId(p.getTxnId());
        dto.setNote(p.getNote());

        dto.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        dto.setCreatedAt(p.getCreatedAt());
        dto.setConfirmedAt(p.getConfirmedAt());
        dto.setRefundedAt(p.getRefundedAt());

        if (b != null) {
            dto.setPaymentDeadline(b.getPaymentDeadline());
            dto.setViewingDeadline(b.getViewingDeadline());
            dto.setDecisionStatus(b.getDecisionStatus() != null ? b.getDecisionStatus().name() : "NONE");
            dto.setDecisionNote(b.getDecisionNote());
            // ✅ expose booking status so frontend can hide buttons after completion
            dto.setBookingStatus(b.getStatus() != null ? b.getStatus().name() : null);
        }

        // providerPayoutStatus is filled in PaymentService.listPayments(...) if available
        return dto;
    }
}
