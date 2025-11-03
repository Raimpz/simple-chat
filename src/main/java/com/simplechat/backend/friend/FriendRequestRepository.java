package com.simplechat.backend.friend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    List<FriendRequest> findByReceiverId(Long receiverId);

    List<FriendRequest> findBySenderId(Long senderId);

    List<FriendRequest> findByReceiverIdAndStatus(Long receiverId, FriendStatus status);

    Optional<FriendRequest> findBySenderIdAndReceiverId(Long senderId, Long receiverId);
}