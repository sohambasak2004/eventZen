FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml ./
COPY src ./src
COPY private.pem ./private.pem
COPY public.pem ./public.pem

RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache netcat-openbsd

COPY --from=build /app/target/auth-service-1.0.0.jar app.jar
COPY --from=build /app/private.pem ./private.pem
COPY --from=build /app/public.pem ./public.pem
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8081

ENTRYPOINT ["./docker-entrypoint.sh"]
