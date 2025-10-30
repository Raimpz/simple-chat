package com.simplechat.backend.message;

public record ChatMessageRequest(
    Long recipientId,
    String content
) {}