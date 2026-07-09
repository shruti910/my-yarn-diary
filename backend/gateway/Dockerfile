# Stage 1: Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Automatically download the Grafana tracking agent binary into the container layer
ADD https://github.com/grafana/grafana-opentelemetry-java/releases/latest/download/grafana-opentelemetry-java.jar grafana-agent.jar

# Copy the compiled JAR file from the build stage
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 3000

# Execute the application with the agent attached
ENTRYPOINT ["java", "-javaagent:grafana-agent.jar", "-jar", "app.jar"]