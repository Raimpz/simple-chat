package com.simplechat.backend.auth;

import com.simplechat.backend.user.RegistrationRequest;
import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegistrationRequest request) {
        try {
            User newUser = userService.registerUser(request);

            return ResponseEntity.status(201).body(newUser);
        } catch (IllegalStateException e) {

            return ResponseEntity.status(400).body(e.getMessage());
        }
    }
}
