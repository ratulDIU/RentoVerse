package com.rentoverse.app.dto;

import com.rentoverse.app.model.Booking;
import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.User;
import lombok.Getter;

import java.util.Date;

@Getter
public class BookingRequestDto {

    private Long id;
    private Room room;
    private User renter;
    private String status;
    private Date createdAt;
    private Date paymentDeadline;   // when AWAITING_PAYMENT expires
    private Date viewingDeadline;   // when PAID_CONFIRMED visit window expires

    public BookingRequestDto() {}

    public BookingRequestDto(Booking booking) {
        this.id = booking.getId();
        this.room = booking.getRoom();
        this.renter = booking.getRenter();
        this.status = booking.getStatus().name();
        this.createdAt = booking.getCreatedAt();
        this.paymentDeadline = booking.getPaymentDeadline();
        this.viewingDeadline = booking.getViewingDeadline();
    }
}
