package com.simplechat.backend.message;

import com.simplechat.backend.user.UserDto;
import java.time.LocalDateTime;

public class MessageDto {

    private Long id;
    private String content;
    private LocalDateTime timestamp;
    private UserDto sender;
    private UserDto recipient;

    public static MessageDto fromMessage(Message message) {
        return new MessageDto(
            message.getId(),
            message.getContent(),
            message.getTimestamp(),
            UserDto.fromUser(message.getSender()),
            UserDto.fromUser(message.getRecipient())
        );
    }

    public MessageDto() {}
    public MessageDto(Long id, String content, LocalDateTime timestamp, UserDto sender, UserDto recipient) {
        this.id = id;
        this.content = content;
        this.timestamp = timestamp;
        this.sender = sender;
        this.recipient = recipient;
    }
    public Long getId() { return id; }
    public String getContent() { return content; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public UserDto getSender() { return sender; }
    public UserDto getRecipient() { return recipient; }
    public void setId(Long id) { this.id = id; }
    public void setContent(String content) { this.content = content; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public void setSender(UserDto sender) { this.sender = sender; }
    public void setRecipient(UserDto recipient) { this.recipient = recipient; }
}