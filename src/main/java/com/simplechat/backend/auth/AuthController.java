package com.simplechat.backend.auth;

import com.simplechat.backend.jwt.JwtService;
import com.simplechat.backend.user.RegistrationRequest;
import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserService;
import com.simplechat.backend.email.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;

    public AuthController(
            UserService userService,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            EmailService emailService 
    ) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody @Valid RegistrationRequest request) {
        try {
            User newUser = userService.registerUser(request);
            emailService.sendVerificationEmail(newUser.getEmail(), newUser.getVerificationCode());

            return ResponseEntity.status(201).body(Map.of("message", "Registration successful. Please check your email for the verification code."));

        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyAccount(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");
        boolean isVerified = userService.verifyUser(email, code);

        if (isVerified) {
            return ResponseEntity.ok(Map.of("message", "Account verified! You can now login."));
        } else {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid verification code or email"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {
        try {
            if (!userService.isUserEnabled(request.username())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Account not verified. Please check your email."));
            }

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            String username = authentication.getName();
            String token = jwtService.generateToken(username);

            return ResponseEntity.ok(new LoginResponse(token));

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password"));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        try {
            userService.requestPasswordReset(email);
            User user = userService.getUserByEmail(email);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getResetCode());

            return ResponseEntity.ok(Map.of("message", "Reset code sent to email"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Email not found"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");
        String newPassword = payload.get("newPassword");

        try {
            userService.resetPassword(email, code, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Something went wrong"));
        }
    }
}