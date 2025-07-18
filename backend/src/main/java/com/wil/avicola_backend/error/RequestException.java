package com.wil.avicola_backend.error;

public class RequestException extends RuntimeException {

    public RequestException(String message) {
        super(message);
    }
}