FROM gradle:8.5-jdk17 AS build
WORKDIR /app

COPY --chown=gradle:gradle . .

RUN gradle bootJar -x test --no-daemon

FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]