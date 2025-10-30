package com.simplechat.backend.message;

import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    public Message saveMessage(User sender, ChatMessageRequest request) {
        User recipient = userRepository.findById(request.recipientId())
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));

        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setContent(request.content());
        message.setTimestamp(LocalDateTime.now());

        // 3. Save it to the database
        return messageRepository.save(message);
    }
}