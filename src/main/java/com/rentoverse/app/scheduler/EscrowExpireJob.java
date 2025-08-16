package com.rentoverse.app.scheduler;

import com.rentoverse.app.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class EscrowExpireJob {

    private final BookingService bookingService;

    /** Every 15 minutes */
    @Scheduled(cron = "0 */15 * * * *")
    public void sweepEvery15Minutes() {
        int a = bookingService.expireUnpaidAwaitingPayments();
        int b = bookingService.expireNoVisit();
        if (a > 0 || b > 0) {
            log.info("EscrowExpireJob: expired {} unpaid + {} no-visit bookings.", a, b);
        }
    }

    /** DEV fallback: every 60s (uncomment while developing locally) */
    // @Scheduled(fixedDelay = 60_000L, initialDelay = 10_000L)
    public void sweepEveryMinuteForLocalDev() {
        int a = bookingService.expireUnpaidAwaitingPayments();
        int b = bookingService.expireNoVisit();
        if (a > 0 || b > 0) {
            log.info("[DEV] expired {} unpaid + {} no-visit.", a, b);
        }
    }
}
