package com.vibeshelf.vibeshelf_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final UserDetailsService userDetailsService;

    // ✅ Define public paths that this filter should COMPLETELY IGNORE
    private static final List<String> PUBLIC_API_PREFIXES = Arrays.asList(
            "/api/users/signup",
            "/api/users/login",
            "/api/users/verify-otp",
            "/h2-console" // For /h2-console and its sub-paths
    );
    // (Legacy lyric endpoint removed; any lyric-related handling moved/removed.)


    public JwtAuthFilter(UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    // ✅ Helper method to check if a request URI should be ignored by this filter
    private boolean shouldFilterIgnore(String requestURI) {
        if (requestURI.startsWith("/h2-console")) {
            return true; // Ignore /h2-console and all its sub-paths
        }
        return PUBLIC_API_PREFIXES.stream().anyMatch(path -> requestURI.equals(path)); // Check for exact matches
    }


    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String requestURI = request.getRequestURI(); // Get the requested URI

        // ✅ FIX: If it's a designated public path, skip JWT processing entirely and pass to next filter.
        if (shouldFilterIgnore(requestURI)) {
            System.out.println("DEBUG: JwtAuthFilter - Skipping filter for public path: " + requestURI);
            filterChain.doFilter(request, response);
            return; // IMPORTANT: Exit the filter
        }

        System.out.println("DEBUG: JwtAuthFilter - Processing request for URI: " + requestURI);

        final String authHeader = request.getHeader("Authorization");
        String token = null;
        String userEmail = null;

        // 1. Extract Token from Header (only for non-public paths)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            System.out.println("DEBUG: JwtAuthFilter - Found Bearer token in header.");
            try {
                userEmail = JwtUtil.extractEmail(token);
                System.out.println("DEBUG: JwtAuthFilter - Extracted email from token: " + userEmail);
            } catch (Exception e) {
                System.err.println("ERROR: JwtAuthFilter - Failed to extract email from token for URI " + requestURI + ": " + e.getMessage());
                // Don't set authentication, let it fall through to be denied later if needed
            }
        } else {
            System.out.println("DEBUG: JwtAuthFilter - No Bearer token found for URI: " + requestURI);
            // For authenticated paths without a token, SecurityContextHolder will be null, leading to denial later.
        }

        // 2. Authenticate if userEmail is found AND no existing authentication
        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = null;
            try {
                userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                System.out.println("DEBUG: JwtAuthFilter - UserDetails loaded for: " + userEmail + ". Verified: " + userDetails.isEnabled());

            } catch (Exception e) {
                System.err.println("ERROR: JwtAuthFilter - UserDetailsService failed to load user '" + userEmail + "' for URI " + requestURI + ": " + e.getMessage());
            }

            if (userDetails != null) {
                if (JwtUtil.validateToken(token)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("DEBUG: JwtAuthFilter - Authentication set for user: " + userEmail + " for URI: " + requestURI);
                } else {
                    System.err.println("ERROR: JwtAuthFilter - JWT validation failed for user: " + userEmail + " for URI " + requestURI + ". Token: " + token);
                }
            }
        } else if (userEmail != null) {
            System.out.println("DEBUG: JwtAuthFilter - User email found for " + requestURI + ", but already authenticated or email is null. Skipping authentication.");
        }

        // Proceed with the rest of the filter chain (e.g., authorization rules defined in SecurityConfig)
        filterChain.doFilter(request, response);
    }
}