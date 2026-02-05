package com.vibeshelf.vibeshelf_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class HealthController {

    @Autowired
    private DataSource dataSource;

    @Autowired(required = false)
    private RedisConnectionFactory redisConnectionFactory;

    /**
     * Basic health check endpoint
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        boolean overallHealthy = true;
        
        try {
            health.put("status", "UP");
            health.put("timestamp", System.currentTimeMillis());
            health.put("application", "vibeshelf-backend");
            health.put("version", "1.0.0");
            
            // Database health check
            Map<String, Object> databaseHealth = checkDatabaseHealth();
            health.put("database", databaseHealth);
            if (!"UP".equals(databaseHealth.get("status"))) {
                overallHealthy = false;
            }
            
            // Redis health check
            Map<String, Object> redisHealth = checkRedisHealth();
            health.put("redis", redisHealth);
            
            // Memory info
            health.put("memory", getMemoryInfo());
            
            if (!overallHealthy) {
                health.put("status", "DOWN");
                return ResponseEntity.status(503).body(health);
            }
            
            return ResponseEntity.ok(health);
            
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("error", e.getMessage());
            return ResponseEntity.status(503).body(health);
        }
    }

    private Map<String, Object> checkDatabaseHealth() {
        Map<String, Object> dbHealth = new HashMap<>();
        
        try {
            long startTime = System.currentTimeMillis();
            Connection connection = dataSource.getConnection();
            boolean isValid = connection.isValid(5);
            connection.close();
            long responseTime = System.currentTimeMillis() - startTime;
            
            dbHealth.put("status", isValid ? "UP" : "DOWN");
            dbHealth.put("responseTime", responseTime + "ms");
            dbHealth.put("driver", "H2 Database");
            
        } catch (Exception e) {
            dbHealth.put("status", "DOWN");
            dbHealth.put("error", e.getMessage());
        }
        
        return dbHealth;
    }

    private Map<String, Object> checkRedisHealth() {
        Map<String, Object> redisHealth = new HashMap<>();
        
        try {
            if (redisConnectionFactory == null) {
                redisHealth.put("status", "NOT_AVAILABLE");
                redisHealth.put("note", "Redis not configured - using Caffeine fallback");
                return redisHealth;
            }
            
            long startTime = System.currentTimeMillis();
            redisConnectionFactory.getConnection().ping();
            long responseTime = System.currentTimeMillis() - startTime;
            
            redisHealth.put("status", "UP");
            redisHealth.put("responseTime", responseTime + "ms");
            redisHealth.put("type", "Redis");
            
        } catch (Exception e) {
            redisHealth.put("status", "DOWN");
            redisHealth.put("error", e.getMessage());
            redisHealth.put("fallback", "Caffeine cache active");
        }
        
        return redisHealth;
    }

    private Map<String, Object> getMemoryInfo() {
        Map<String, Object> memory = new HashMap<>();
        Runtime runtime = Runtime.getRuntime();
        
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        
        memory.put("max", formatBytes(maxMemory));
        memory.put("total", formatBytes(totalMemory));
        memory.put("used", formatBytes(usedMemory));
        memory.put("free", formatBytes(freeMemory));
        memory.put("usagePercentage", Math.round((double) usedMemory / totalMemory * 100));
        
        return memory;
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}