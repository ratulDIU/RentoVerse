// src/main/java/com/rentoverse/app/dto/ProviderPayoutDto.java
package com.rentoverse.app.dto;

import com.rentoverse.app.model.ProviderPayout;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProviderPayoutDto {
    private Long id;
    private Long bookingId;
    private String providerEmail;
    private String roomCode;
    private String method;
    private String account;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    public static ProviderPayoutDto from(ProviderPayout p) {
        ProviderPayoutDto dto = new ProviderPayoutDto();
        dto.setId(p.getId());
        dto.setBookingId(p.getBooking() != null ? p.getBooking().getId() : null);
        dto.setProviderEmail(p.getProviderEmail());
        dto.setRoomCode(p.getRoomCode());
        dto.setMethod(p.getMethod());
        dto.setAccount(p.getAccount());
        dto.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
        dto.setCreatedAt(p.getCreatedAt());
        dto.setPaidAt(p.getPaidAt());
        return dto;
    }
}
