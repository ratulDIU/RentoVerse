package com.rentoverse.app.model;

public enum Status {
    // request phase
    PENDING_REQUEST,
    DECLINED,

    // escrow & visit phase
    AWAITING_PAYMENT,
    CONFIRMED,       // kept for compatibility (not used now)
    PAID_CONFIRMED,  // 25% received by admin, visit window open

    // terminal positive
    COMPLETED,       // provider confirmed renter liked; released to provider

    // terminal negative
    CANCELLED_AFTER_VIEWING,
    EXPIRED_UNPAID,
    EXPIRED_NO_VISIT
}
