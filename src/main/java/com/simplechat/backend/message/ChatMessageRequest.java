package com.simplechat.backend.message;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(
    Long recipientId,

    @NotBlank(message = "Message content cannot be empty")
    @Size(max = 1000, message = "Message is too long (max 1000 characters)")
    String content
) {}