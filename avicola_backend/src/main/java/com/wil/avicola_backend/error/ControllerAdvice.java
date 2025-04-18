package com.wil.avicola_backend.error;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import com.wil.avicola_backend.error.dto.ErrorMessage;

@RestControllerAdvice
public class ControllerAdvice extends ResponseEntityExceptionHandler {

    // validaciones
    @SuppressWarnings("null")
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> {
            errors.put(error.getField(), error.getDefaultMessage());
        });
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errors);
    }

    @ExceptionHandler(RequestException.class)
    public ResponseEntity<ErrorMessage> requestException(RequestException ex) {
        ErrorMessage errorMessage = ErrorMessage
                .builder()
                .status(HttpStatus.NOT_ACCEPTABLE.value())
                .info(HttpStatus.NOT_ACCEPTABLE)
                .message(ex.getMessage())
                .build();
        return new ResponseEntity<ErrorMessage>(errorMessage, HttpStatus.NOT_ACCEPTABLE);
    }
}
