package com.simplechat.backend.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(RegistrationRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new IllegalStateException("Username already taken");
        }

        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalStateException("Email already taken");
        }

        User newUser = new User();
        newUser.setUsername(request.username());
        newUser.setEmail(request.email());

        String hashedPassword = passwordEncoder.encode(request.password());
        newUser.setPasswordHash(hashedPassword);

        String code = UUID.randomUUID().toString().substring(0, 6);
        newUser.setVerificationCode(code);
        newUser.setEnabled(false);

        return userRepository.save(newUser);
    }

    public boolean verifyUser(String email, String code) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            if (code.equals(user.getVerificationCode())) {
                user.setEnabled(true);
                user.setVerificationCode(null);
                userRepository.save(user);

                return true;
            }
        }
        return false;
    }

    public boolean isUserEnabled(String username) {
        return userRepository.findByUsername(username).map(User::isEnabled).orElse(false);
    }

    public void requestPasswordReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String code = UUID.randomUUID().toString().substring(0, 6);

            user.setResetCode(code);
            user.setResetExpiry(LocalDateTime.now().plusMinutes(15));

            userRepository.save(user);
        } else {
            throw new IllegalArgumentException("Email not found");
        }
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Invalid email"));

        if (user.getResetCode() == null || !user.getResetCode().equals(code)) {
            throw new IllegalArgumentException("Invalid code");
        }

        if (user.getResetExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Code expired");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetCode(null);
        user.setResetExpiry(null);
        userRepository.save(user);
    }
}
