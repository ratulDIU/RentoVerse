package com.rentoverse.app.dto;

import com.rentoverse.app.model.SupportCategory;
import com.rentoverse.app.model.TicketStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SupportDtos {

    public static class CreateRequest {
        @NotBlank public String name;
        @NotBlank @Email public String email;
        @NotNull  public SupportCategory category;
        @NotBlank public String subject;
        @NotBlank public String message;
    }

    public static class UpdateStatusRequest {
        @NotNull public TicketStatus status;
    }

    public static class Response {
        public Long id;
        public String name;
        public String email;
        public SupportCategory category;
        public String subject;
        public String message;
        public TicketStatus status;
        public String createdAt;

        public Response(Long id, String name, String email, SupportCategory category,
                        String subject, String message, TicketStatus status, String createdAt) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.category = category;
            this.subject = subject;
            this.message = message;
            this.status = status;
            this.createdAt = createdAt;
        }
    }
}
