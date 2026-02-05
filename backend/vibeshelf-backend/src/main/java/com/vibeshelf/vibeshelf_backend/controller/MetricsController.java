package com.vibeshelf.vibeshelf_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class MetricsController {

    @Autowired
    private CacheManager cacheManager;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * Get basic application metrics
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        try {
            metrics.put("timestamp", System.currentTimeMillis());
            metrics.put("cache", getCacheInfo());
            metrics.put("system", getSystemInfo());
            metrics.put("application", getApplicationInfo());
            
            return ResponseEntity.ok(metrics);
            
        } catch (Exception e) {
            metrics.put("error", e.getMessage());
            return ResponseEntity.status(500).body(metrics);
        }
    }

    /**
     * Get cache information
     */
    @GetMapping("/cache")
    public ResponseEntity<Map<String, Object>> getCacheEndpoint() {
        Map<String, Object> cacheInfo = getCacheInfo();
        return ResponseEntity.ok(cacheInfo);
    }

    private Map<String, Object> getCacheInfo() {
        Map<String, Object> cacheInfo = new HashMap<>();
        
        try {
            if (cacheManager != null) {
                cacheInfo.put("cacheNames", cacheManager.getCacheNames());
                cacheInfo.put("totalCaches", cacheManager.getCacheNames().size());
            }
            
            if (redisTemplate != null) {
                Map<String, Object> redisInfo = new HashMap<>();
                redisInfo.put("connected", true);
                redisInfo.put("type", "Redis");
                cacheInfo.put("redis", redisInfo);
            } else {
                Map<String, Object> fallbackInfo = new HashMap<>();
                fallbackInfo.put("type", "Caffeine (Fallback)");
                fallbackInfo.put("status", "Active");
                cacheInfo.put("fallback", fallbackInfo);
            }
            
        } catch (Exception e) {
            cacheInfo.put("error", e.getMessage());
        }
        
        return cacheInfo;
    }

    private Map<String, Object> getSystemInfo() {
        Map<String, Object> system = new HashMap<>();
        Runtime runtime = Runtime.getRuntime();
        
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        
        system.put("processors", runtime.availableProcessors());
        system.put("javaVersion", System.getProperty("java.version"));
        system.put("memoryUsed", formatBytes(usedMemory));
        system.put("memoryMax", formatBytes(maxMemory));
        system.put("memoryUsagePercent", Math.round((double) usedMemory / maxMemory * 100));
        
        return system;
    }

    private Map<String, Object> getApplicationInfo() {
        Map<String, Object> app = new HashMap<>();
        
        app.put("name", "vibeshelf-backend");
        app.put("version", "1.0.0");
        app.put("optimizationLevel", "Enterprise");
        app.put("datasetCapacity", "90K+ books");
        app.put("cacheStrategy", "Multi-level (Redis + Caffeine)");
        app.put("rateLimitingStatus", "Active");
        
        return app;
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}