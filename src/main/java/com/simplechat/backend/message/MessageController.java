package com.simplechat.backend.message;

import java.util.List;
import com.simplechat.backend.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/{friendId}")
    public ResponseEntity<List<MessageDto>> getChatHistory(@PathVariable Long friendId, Authentication authentication, @RequestParam(defaultValue = "0") int page) {
        User currentUser = (User) authentication.getPrincipal();
        List<MessageDto> history = messageService.getChatHistory(currentUser, friendId, page);

        return ResponseEntity.ok(history);
    }
}