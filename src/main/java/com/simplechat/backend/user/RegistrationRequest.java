package com.simplechat.backend.user;

public record RegistrationRequest(
    String username,
    String email,
    String password
) {}