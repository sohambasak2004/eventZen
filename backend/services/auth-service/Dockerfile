FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
COPY private.pem ./private.pem
COPY public.pem ./public.pem

RUN apk add --no-cache maven && \
    mvn -f pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/auth-service-1.0.0.jar app.jar
COPY --from=build /app/private.pem ./private.pem
COPY --from=build /app/public.pem ./public.pem

EXPOSE 8083

ENTRYPOINT ["java", "-jar", "app.jar"]
