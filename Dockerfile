# ---- Build stage (JDK 24) ----
FROM maven:3.9.9-eclipse-temurin-24 AS build
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

# ---- Run stage (JDK 24) ----
FROM eclipse-temurin:24-jdk
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render নিজের PORT দেয়; Spring Boot আমাদের application-render.properties থেকে PORT ধরবে
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
