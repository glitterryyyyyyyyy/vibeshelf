package com.vibeshelf.vibeshelf_backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    // JavaMailSender is optional — some environments (local dev) may not configure SMTP.
    // Allow the application to start even when no JavaMailSender bean is available.
    private JavaMailSender mailSender;

    public EmailService(@org.springframework.beans.factory.annotation.Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
        if (this.mailSender == null) {
            System.out.println("EmailService: JavaMailSender not configured — emails will be no-ops.");
        }
    }

    public void sendEmail(String to, String subject, String text) {
        if (mailSender == null) {
            // Mail sender not configured; log and skip sending to avoid startup failure.
            System.out.println("EmailService: skipping sendEmail because JavaMailSender is not configured. recipient=" + to);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
        System.out.println("Email sent to " + to);
    }
}
