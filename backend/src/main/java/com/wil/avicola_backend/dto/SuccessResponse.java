package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SuccessResponse {
    private int status;
    private String message;
    private Object data;

    public SuccessResponse(String message) {
        this.message = message;
        this.status = 200;
        this.data = null;
    }
    
    public SuccessResponse(String message, Object data) {
        this.message = message;
        this.status = 200;
        this.data = data;
    }
}
