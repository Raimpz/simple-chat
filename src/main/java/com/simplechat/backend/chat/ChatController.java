package com.simplechat.backend.chat;

import com.simplechat.backend.message.ChatMessageRequest;
import com.simplechat.backend.message.Message;
import com.simplechat.backend.message.MessageDto;
import com.simplechat.backend.message.MessageService;
import com.simplechat.backend.user.User;
import com.simplechat.backend.user.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import java.util.stream.Collectors;
import java.util.Set;
import org.springframework.stereotype.Controller;
import java.security.Principal;
import jakarta.validation.Valid;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final UserRepository userRepository;
    private final SimpUserRegistry userRegistry;

    public ChatController(SimpMessagingTemplate messagingTemplate, 
        MessageService messageService, 
        UserRepository userRepository, 
        SimpUserRegistry userRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
        this.userRepository = userRepository;
        this.userRegistry = userRegistry;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload @Valid ChatMessageRequest chatMessage, Principal principal) {
        String username = principal.getName();

        User sender = userRepository.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        Message savedMessage = messageService.saveMessage(sender, chatMessage);

        MessageDto messageDto = MessageDto.fromMessage(savedMessage);

        String recipientUsername = savedMessage.getRecipient().getUsername();
        String senderUsername = sender.getUsername();
        String recipientDestination = "/user/" + recipientUsername + "/queue/private";
        messagingTemplate.convertAndSend(recipientDestination, messageDto);
        String senderDestination = "/user/" + senderUsername + "/queue/private";
        messagingTemplate.convertAndSend(senderDestination, messageDto);
    }
}