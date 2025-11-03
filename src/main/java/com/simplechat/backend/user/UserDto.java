package com.simplechat.backend.user;

public record UserDto(
    Long id,
    String username
) {

    public static UserDto fromUser(User user) {
        return new UserDto(user.getId(), user.getUsername());
    }
}