package com.vibeshelf.vibeshelf_backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.caffeine.CaffeineCacheManager;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    @ConditionalOnProperty(value = "spring.redis.host", matchIfMissing = false)
    public RedisConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory();
    }

    @Bean
    @ConditionalOnProperty(value = "spring.redis.host", matchIfMissing = false)
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setDefaultSerializer(new GenericJackson2JsonRedisSerializer());
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    @Primary
    @ConditionalOnProperty(value = "spring.redis.host", matchIfMissing = false)
    public CacheManager redisCacheManager(RedisConnectionFactory redisConnectionFactory) {
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Cache configuration for different cache names with different TTL
        cacheConfigurations.put("books:page", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues());
                
        cacheConfigurations.put("books:search", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .disableCachingNullValues());
                
        cacheConfigurations.put("books:popular", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(2))
                .disableCachingNullValues());
                
        cacheConfigurations.put("books:count", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues());
                
        cacheConfigurations.put("books:genre", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(15))
                .disableCachingNullValues());
                
        cacheConfigurations.put("books:suggestions", 
            RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(60))
                .disableCachingNullValues());

        return RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues())
            .withInitialCacheConfigurations(cacheConfigurations)
            .build();
    }

    // Fallback to Caffeine cache if Redis is not available
    @Bean
    @ConditionalOnProperty(value = "spring.redis.host", havingValue = "false", matchIfMissing = true)
    public CacheManager caffeineCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        
        // Configure specific caches
        cacheManager.setCacheNames(java.util.Arrays.asList(
            "books:page", "books:search", "books:popular", 
            "books:count", "books:genre", "books:suggestions"));
        return cacheManager;
    }
    
    // Cache key generator for complex cache keys
    @Bean("customKeyGenerator")
    public org.springframework.cache.interceptor.KeyGenerator customKeyGenerator() {
        return (target, method, params) -> {
            StringBuilder sb = new StringBuilder();
            sb.append(method.getName());
            for (Object param : params) {
                if (param != null) {
                    sb.append(":").append(param.toString());
                }
            }
            return sb.toString();
        };
    }
}