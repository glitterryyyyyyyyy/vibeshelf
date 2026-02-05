# Use Java 17 (required for Spring Boot 3)
FROM eclipse-temurin:17-jdk

# Set working directory
WORKDIR /app

# Copy all backend files
COPY . .

# Make Maven wrapper executable
RUN chmod +x mvnw

# Build the application (skip tests)
RUN ./mvnw clean package -DskipTests

# Expose Spring Boot port
EXPOSE 8080

# Run the generated JAR
CMD ["java", "-jar", "target/vibeshelf-backend-0.0.1-SNAPSHOT.jar"]

