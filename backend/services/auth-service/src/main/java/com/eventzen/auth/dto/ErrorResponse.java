package com.eventzen.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String code;
    private String message;
    private String traceId;

    public static ErrorResponse of(int status, String code, String message, String traceId) {
        return ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(status)
            .code(code)
            .message(message)
            .traceId(traceId)
            .build();
    }
}
