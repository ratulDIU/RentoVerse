package com.rentoverse.app.dto;


import com.rentoverse.app.model.Status;

public class BookingDTO {
    private Long id;
    private Long renterId;
    private Long roomId;
    private Status status;

    // Constructors
    public BookingDTO() {}

    public BookingDTO(Long id, Long renterId, Long roomId, Status status) {
        this.id = id;
        this.renterId = renterId;
        this.roomId = roomId;
        this.status = status;
    }

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRenterId() {
        return renterId;
    }

    public void setRenterId(Long renterId) {
        this.renterId = renterId;
    }

    public Long getRoomId() {
        return roomId;
    }

    public void setRoomId(Long roomId) {
        this.roomId = roomId;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }


}

