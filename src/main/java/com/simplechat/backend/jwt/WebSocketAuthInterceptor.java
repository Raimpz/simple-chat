package com.simplechat.backend.jwt;

import com.simplechat.backend.user.AppUserDetailsService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    public WebSocketAuthInterceptor(JwtService jwtService, AppUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                
                try {
                    String username = jwtService.extractUsername(jwt);

                    if (username != null) {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                        if (jwtService.isTokenValid(jwt, userDetails.getUsername())) {
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                            accessor.setUser(authToken); 
                            System.out.println("WebSocket: User authenticated - " + authToken.getName());
                        }
                    }
                } catch (Exception e) {
                    System.err.println("WebSocket: Authentication failed: " + e.getMessage());
                }
            }
        }

        return message;
    }
}