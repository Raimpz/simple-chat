package com.simplechat.backend.message;

import java.util.stream.Collectors;
import java.util.List;
import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

        return messageRepository.save(message);
    }

    public List<MessageDto> getChatHistory(User currentUser, Long friendId, int page) {
        Pageable pageable = PageRequest.of(page, 20);

        return messageRepository.findBySenderIdAndRecipientIdOrSenderIdAndRecipientIdOrderByTimestampDesc(
                currentUser.getId(), friendId,
                friendId, currentUser.getId(),
                pageable
        )
        .stream()
        .map(MessageDto::fromMessage)
        .sorted((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()))
        .collect(Collectors.toList());
    }
}