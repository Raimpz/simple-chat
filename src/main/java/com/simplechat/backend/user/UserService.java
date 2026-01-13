package com.simplechat.backend.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

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
}
