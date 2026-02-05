// src/main/java/com/vibeshelf/vibeshelf_backend/security/JwtUtil.java
package com.vibeshelf.vibeshelf_backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

    // ✅ IMPORTANT: THIS IS HARDCODED FOR LOCAL TESTING ONLY.
    // THIS KEY IS PUBLICLY VISIBLE IF YOU DEPLOY CODE WITH IT!
    // REPLACE WITH YOUR ACTUAL, VERY LONG, RANDOM STRING FOR LOCAL DEV.
    private static final String SECRET_KEY_STRING = "YOUR_VERY_LONG_RANDOM_JWT_SECRET_KEY_GOES_HERE_AT_LEAST_32_BYTES_FOR_LOCAL_DEV"; // Replace this placeholder with YOUR actual secret key value!

    // ✅ Token validity: 365 days (for "forever" until logout)
    private static final long EXPIRATION_TIME = 365L * 24 * 60 * 60 * 1000; // 365 days in milliseconds

    private static Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY_STRING.getBytes());
    }

    public static String generateToken(String email, String userId) {
        return Jwts.builder()
                .setSubject(email)
                .claim("userId", userId)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public static boolean validateToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public static String extractEmail(String token) {
         Claims claims = Jwts.parserBuilder()
                 .setSigningKey(getSigningKey())
                 .build()
                 .parseClaimsJws(token)
                 .getBody();
         return claims.getSubject();
     }

     public static String extractUserId(String token) {
         Claims claims = Jwts.parserBuilder()
                 .setSigningKey(getSigningKey())
                 .build()
                 .parseClaimsJws(token)
                 .getBody();
         return claims.get("userId", String.class);
     }
}