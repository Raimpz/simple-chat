package com.simplechat.backend.user;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMyProfile(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        UserDto userDto = UserDto.fromUser(currentUser);

        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam("query") String query, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<User> users = userRepository.findByUsernameContainingIgnoreCaseAndIdNot(query, currentUser.getId());
        List<UserDto> userDtos = users.stream().map(UserDto::fromUser).collect(Collectors.toList());

        return ResponseEntity.ok(userDtos);
    }
}