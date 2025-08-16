package com.rentoverse.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserLiteDto {
    private Long id;
    private String name;
    private String email;
}
