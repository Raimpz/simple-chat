package com.simplechat.backend.friend;

public record FriendRequestResponse(
    FriendStatus status
) {
    public boolean isValidResponse() {
        return status == FriendStatus.ACCEPTED || status == FriendStatus.DECLINED;
    }
}