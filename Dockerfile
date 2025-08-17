# ---- Build stage (JDK 21) ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
# faster reproducible build flags
RUN ./mvnw -B -V -DskipTests clean package

# ---- Run stage (JRE 21) ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV JAVA_OPTS=""
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
