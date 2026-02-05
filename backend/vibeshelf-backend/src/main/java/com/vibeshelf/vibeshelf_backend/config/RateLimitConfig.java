package com.vibeshelf.vibeshelf_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Simplified rate-limit configuration — the original project used Bucket4j.
 * For a minimal run (and because the external dependency was missing),
 * this configuration registers a no-op interceptor that allows all requests.
 *
 * If you want real rate limiting, we can re-add Bucket4j and its config later.
 */
@Configuration
public class RateLimitConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new NoOpRateLimitInterceptor())
                .addPathPatterns("/api/**");
    }

    private static class NoOpRateLimitInterceptor implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            // Allow all requests through (no rate limiting)
            return true;
        }
    }
}