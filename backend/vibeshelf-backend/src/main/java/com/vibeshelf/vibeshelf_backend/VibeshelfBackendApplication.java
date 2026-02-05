package com.vibeshelf.vibeshelf_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
@SpringBootApplication
@ComponentScan(basePackages = "com.vibeshelf.vibeshelf_backend")
public class VibeshelfBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(VibeshelfBackendApplication.class, args);
    }

}
