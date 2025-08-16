package com.rentoverse.app.dto;

import lombok.Getter;

@Getter
public class AdminAccessRequest {
    private String name;
    private String email;
    private String password;
    private String secretKey;


    // getters & setters
}
