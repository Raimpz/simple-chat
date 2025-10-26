package com.simplechat.backend.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

        return userRepository.save(newUser);
    }
}