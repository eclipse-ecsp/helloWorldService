FROM azul/zulu-openjdk-alpine:17.0.14-17.56-jre-headless

RUN apk update && apk add --no-cache bash curl

LABEL authors="Abhishek Kumar"

ARG PROJECT_JAR_NAME
ENV PROJECT_JAR_NAME ${PROJECT_JAR_NAME}

ADD ./target/${PROJECT_JAR_NAME}.jar /opt/app/app.jar

EXPOSE 7000 8080
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /opt/app/
USER appuser

ENTRYPOINT ["/usr/bin/java", "-jar", "/opt/app/app.jar"]
