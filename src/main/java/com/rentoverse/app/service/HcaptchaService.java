package com.rentoverse.app.service;

import com.rentoverse.app.dto.HcaptchaVerifyResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class HcaptchaService {

    private final WebClient webClient;

    @Value("${hcaptcha.secret}")
    private String secret;

    @Value("${hcaptcha.verify-url}")
    private String verifyUrl;

    public HcaptchaService(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    public boolean verify(String token, String ip) {
        if (token == null || token.isBlank()) return false;
        try {
            HcaptchaVerifyResponse resp = webClient.post()
                    .uri(verifyUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .bodyValue("secret=" + secret + "&response=" + token + (ip != null ? "&remoteip=" + ip : ""))
                    .retrieve()
                    .bodyToMono(HcaptchaVerifyResponse.class)
                    .onErrorReturn(new HcaptchaVerifyResponse())
                    .block();
            return resp != null && resp.isSuccess();
        } catch (Exception e) {
            return false;
        }
    }
}