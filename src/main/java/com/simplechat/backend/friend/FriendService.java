package com.simplechat.backend.friend;

import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserDto;
import com.simplechat.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Service
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    public FriendService(FriendRequestRepository friendRequestRepository, UserRepository userRepository) {
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FriendRequest sendFriendRequest(User sender, Long receiverId) {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        if (sender.getId().equals(receiverId)) {
            throw new IllegalStateException("You cannot send a friend request to yourself.");
        }

        Optional<FriendRequest> existingRequest = friendRequestRepository
                .findBySenderIdAndReceiverId(sender.getId(), receiverId);

        if (existingRequest.isPresent()) {
            FriendRequest req = existingRequest.get();

            if (req.getStatus() == FriendStatus.PENDING) {
                throw new IllegalStateException("Friend request already pending.");
            }

            if (req.getStatus() == FriendStatus.ACCEPTED) {
                throw new IllegalStateException("You are already friends.");
            }

            if (req.getStatus() == FriendStatus.DECLINED) {
                req.setStatus(FriendStatus.PENDING);
                req.setCreatedAt(LocalDateTime.now());
                return friendRequestRepository.save(req);
            }
        }

        Optional<FriendRequest> reverseRequest = friendRequestRepository
                .findBySenderIdAndReceiverId(receiverId, sender.getId());

        if (reverseRequest.isPresent()) {
            FriendRequest req = reverseRequest.get();
            
            if (req.getStatus() == FriendStatus.PENDING) {
                throw new IllegalStateException("This user has already sent you a request. Check your inbox!");
            }
            if (req.getStatus() == FriendStatus.ACCEPTED) {
                throw new IllegalStateException("You are already friends.");
            }
        }

        FriendRequest newRequest = new FriendRequest();
        newRequest.setSender(sender);
        newRequest.setReceiver(receiver);
        newRequest.setStatus(FriendStatus.PENDING);
        newRequest.setCreatedAt(LocalDateTime.now());

        return friendRequestRepository.save(newRequest);
    }

    @Transactional
    public FriendRequest respondToFriendRequest(User currentUser, Long requestId, FriendStatus newStatus) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        if (!request.getReceiver().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You cannot respond to this friend request.");
        }

        if (request.getStatus() != FriendStatus.PENDING) {
            throw new IllegalStateException("This request has already been responded to.");
        }

        request.setStatus(newStatus);
        return friendRequestRepository.save(request);
    }

    public List<FriendRequest> getPendingRequests(User currentUser) {
        return friendRequestRepository.findByReceiverIdAndStatus(currentUser.getId(), FriendStatus.PENDING);
    }

    public List<UserDto> getFriends(User currentUser) {
        List<UserDto> friendsFromSent = friendRequestRepository.findBySenderId(currentUser.getId())
                .stream()
                .filter(req -> req.getStatus() == FriendStatus.ACCEPTED)
                .map(FriendRequest::getReceiver)
                .map(UserDto::fromUser)
                .toList();

        List<UserDto> friendsFromReceived = friendRequestRepository.findByReceiverId(currentUser.getId())
                .stream()
                .filter(req -> req.getStatus() == FriendStatus.ACCEPTED)
                .map(FriendRequest::getSender)
                .map(UserDto::fromUser)
                .toList();

        return Stream.concat(friendsFromSent.stream(), friendsFromReceived.stream()).toList();
    }
}