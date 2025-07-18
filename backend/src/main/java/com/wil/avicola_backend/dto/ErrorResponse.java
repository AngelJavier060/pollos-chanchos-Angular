package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponse {
    private int status;
    private String message;
    private String error;
    private Object details;

    public ErrorResponse(String message) {
        this.message = message;
        this.error = "Error";
        this.status = 400;
    }
    
    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
        this.error = "Error";
    }
}
