#!/usr/bin/env bash
# Build and run the Spring Boot backend jar
set -e
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"
./mvnw -DskipTests package
JAR=$(ls target/*SNAPSHOT.jar | head -n1)
if [ -z "$JAR" ]; then
  echo "Jar not found in target/ — build failed?"
  exit 1
fi
java -jar "$JAR" &
PID=$!
echo "Backend started (pid=$PID)"
