package com.simplechat.backend.chat;

import com.simplechat.backend.message.ChatMessageRequest;
import com.simplechat.backend.message.Message;
import com.simplechat.backend.message.MessageService;
import com.simplechat.backend.user.User;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    public ChatController(SimpMessagingTemplate messagingTemplate, MessageService messageService) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest chatMessage, Authentication authentication) {

        User sender = (User) authentication.getPrincipal();

        Message savedMessage = messageService.saveMessage(sender, chatMessage);

        messagingTemplate.convertAndSendToUser(
            savedMessage.getRecipient().getUsername(),
            "/private",
            savedMessage
        );

        messagingTemplate.convertAndSendToUser(
            sender.getUsername(),
            "/private",
            savedMessage
        );
    }
}