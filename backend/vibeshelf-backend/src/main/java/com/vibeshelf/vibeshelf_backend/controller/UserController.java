package com.vibeshelf.vibeshelf_backend.controller;

import com.vibeshelf.vibeshelf_backend.model.User;
import com.vibeshelf.vibeshelf_backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ✅ Signup (register & send OTP)
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        try {
            userService.signup(user); // generates OTP + sends email
            return ResponseEntity.ok("Signup successful! Please check your email for OTP.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Signup failed: " + e.getMessage());
        }
    }

    // ✅ Verify OTP after signup
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestParam String email,
            @RequestParam String otp) {
        try {
            boolean verified = userService.verifyOtp(email, otp);
            if (verified) {
                return ResponseEntity.ok("✅ OTP verified successfully! You can now login.");
            } else {
                return ResponseEntity.badRequest().body("❌ Invalid or expired OTP.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Verification failed: " + e.getMessage());
        }
    }

    // ✅ Login (only allowed if verified)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        return userService.login(loginRequest);
    }
    
    // 🔧 Simple login endpoint that returns just the token (for frontend compatibility)
    @PostMapping("/login-simple")
    public ResponseEntity<?> loginSimple(@RequestBody User loginRequest) {
        ResponseEntity<?> response = userService.login(loginRequest);
        if (response.getStatusCode().is2xxSuccessful()) {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            if (body != null && body.containsKey("token")) {
                // Return just the token string directly
                return ResponseEntity.ok(body.get("token").toString());
            }
        }
        return response;
    }

    // 🔄 Password Reset Request
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        try {
            userService.sendPasswordResetOtp(email);
            return ResponseEntity.ok("Password reset OTP sent to your email.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 🔄 Reset Password with OTP
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestParam String email,
            @RequestParam String otp,
            @RequestParam String newPassword) {
        try {
            boolean reset = userService.resetPassword(email, otp, newPassword);
            if (reset) {
                return ResponseEntity.ok("✅ Password reset successful!");
            } else {
                return ResponseEntity.badRequest().body("❌ Invalid OTP or email.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Reset failed: " + e.getMessage());
        }
    }

    // 👤 Get User Profile (requires authentication)
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String token) {
        try {
            return userService.getUserProfile(token);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ✏️ Update User Profile
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestHeader("Authorization") String token, @RequestBody User updates) {
        try {
            return userService.updateProfile(token, updates);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // 🚪 Logout (optional - for token blacklisting)
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        // In a full implementation, you might blacklist the token
        return ResponseEntity.ok("✅ Logged out successfully!");
    }
    
    // 🔧 Test endpoint to manually verify a user (for development only)
    @PostMapping("/verify-test-user")
    public ResponseEntity<?> verifyTestUser(@RequestParam String email) {
        try {
            return ResponseEntity.ok(userService.verifyTestUser(email));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
