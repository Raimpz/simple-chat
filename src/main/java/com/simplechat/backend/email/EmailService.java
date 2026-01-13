package com.simplechat.backend.email;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("noreply@simplechat.com");
        message.setTo(toEmail);
        message.setSubject("Verify your SimpleChat Account");
        message.setText("Welcome! Your verification code is: " + code);

        mailSender.send(message);
        System.out.println("Mail sent to " + toEmail);
    }
}
