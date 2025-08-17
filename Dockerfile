# ---------- Build stage ----------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn -q -DskipTests clean package

# ---------- Run stage ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

# জার নামটা টার্গেটে যা জেনারেট হয়েছে সেটাই কপি করো
COPY --from=build /app/target/rentoverse-0.0.1-SNAPSHOT.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
# Render আপনার কন্টেইনারে PORT পাঠায়; আমরা সেটাই ব্যবহার করব
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar --server.port=${PORT}"]
