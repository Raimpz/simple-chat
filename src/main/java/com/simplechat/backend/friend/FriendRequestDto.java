package com.simplechat.backend.friend;

import com.simplechat.backend.user.UserDto;
import java.time.LocalDateTime;

public record FriendRequestDto(
    Long id,
    UserDto sender,
    UserDto receiver,
    String status,
    LocalDateTime createdAt
) {
    public static FriendRequestDto fromEntity(FriendRequest request) {
        return new FriendRequestDto(
            request.getId(),
            UserDto.fromUser(request.getSender()),
            UserDto.fromUser(request.getReceiver()),
            request.getStatus().name(),
            request.getCreatedAt()
        );
    }
}