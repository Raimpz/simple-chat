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

    public void sendPasswordResetEmail(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("noreply@simplechat.com");
        message.setTo(toEmail);
        message.setSubject("Reset Your Password");
        message.setText("Use this code to reset your password: " + code + "\n\nThis code expires in 15 minutes.");

        mailSender.send(message);
        System.out.println("Reset mail sent to " + toEmail);
    }
}
