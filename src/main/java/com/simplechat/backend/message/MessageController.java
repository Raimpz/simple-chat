package com.simplechat.backend.message;

import java.util.List;
import com.simplechat.backend.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/{friendId}")
    public ResponseEntity<List<MessageDto>> getChatHistory(@PathVariable Long friendId, Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        List<MessageDto> history = messageService.getChatHistory(currentUser, friendId);

        return ResponseEntity.ok(history);
    }
}