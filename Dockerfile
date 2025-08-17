# ---- Build stage ----
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
# Build Spring Boot jar (tests skip for faster build)
RUN ./mvnw clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:17-jdk
WORKDIR /app

# Copy the jar built in the previous stage
COPY --from=build /app/target/*.jar app.jar

# Render will provide PORT env var; our Spring Boot (application-render.properties)
# already reads server.port=${PORT:10000}, so no extra args needed.
EXPOSE 8080

# Start the app
ENTRYPOINT ["java", "-jar", "app.jar"]
