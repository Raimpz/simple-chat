# 1. Build Stage
FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# Now that this file is at the root, "COPY . ." copies build.gradle AND src!
COPY --chown=gradle:gradle . .

# Build the jar
RUN gradle bootJar -x test --no-daemon

# 2. Run Stage
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]