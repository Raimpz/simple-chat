package com.simplechat.backend.friend;

import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @PostMapping("/request/{receiverId}")
    public ResponseEntity<?> sendFriendRequest(
            @PathVariable Long receiverId,
            Authentication authentication
    ) {
        try {
            User sender = (User) authentication.getPrincipal();
            FriendRequest newRequest = friendService.sendFriendRequest(sender, receiverId);
            return ResponseEntity.status(201).body(FriendRequestDto.fromEntity(newRequest));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<List<FriendRequestDto>> getPendingRequests(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<FriendRequest> requests = friendService.getPendingRequests(currentUser);

        List<FriendRequestDto> dtos = requests.stream()
                .map(FriendRequestDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/respond/{requestId}")
    public ResponseEntity<?> respondToFriendRequest(
            @PathVariable Long requestId,
            @RequestBody FriendRequestResponse response,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();

        if (!response.isValidResponse()) {
            return ResponseEntity.status(400).body("Invalid status: Must be ACCEPTED or DECLINED");
        }

        try {
            FriendRequest updatedRequest = friendService.respondToFriendRequest(
                    currentUser, 
                    requestId, 
                    response.status()
            );

            return ResponseEntity.ok(FriendRequestDto.fromEntity(updatedRequest));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getFriends(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<UserDto> friends = friendService.getFriends(currentUser);
        return ResponseEntity.ok(friends);
    }
}