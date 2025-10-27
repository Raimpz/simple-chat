package com.simplechat.backend.auth;

public record LoginRequest(
    String username,
    String password
) {}