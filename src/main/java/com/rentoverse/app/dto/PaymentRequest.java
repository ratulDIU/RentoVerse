package com.rentoverse.app.dto;

import lombok.Data;

/** JSON payload for renter payment submission (25% deposit) */
@Data
public class PaymentRequest {
    private Double amount;      // required (25% of rent)
    private String method;      // BKASH / NAGAD / ROCKET / MANUAL
    private String reference;   // e.g., "TXN:xxx|ROOM:RENTO:103|BK:42"

    // Optional payer metadata (we also persist them on Payment)
    private String payerName;
    private String payerPhone;
    private String txnId;
    private String note;
}
