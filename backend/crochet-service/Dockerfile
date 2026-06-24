# Stage 1: Build the Java JAR using Maven
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Create the lightweight runtime container
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Automatically download the Grafana tracking agent binary into the container layer
ADD https://github.com/grafana/grafana-opentelemetry-java/releases/latest/download/grafana-opentelemetry-java.jar grafana-agent.jar

# Copy the compiled JAR file from the build stage
COPY --from=build /app/target/*.jar app.jar

# Execute the application with the agent attached
ENTRYPOINT ["java", "-javaagent:grafana-agent.jar", "-jar", "app.jar"]