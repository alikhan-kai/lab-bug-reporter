# One image for the whole reporter service: the API, sdk.js and the dashboard on one port.
# Cache mounts keep downloaded npm and Maven packages between builds, so a rebuild or a retry after a network
# error does not download everything again.

FROM node:22-alpine AS sdk
WORKDIR /build/sdk
COPY sdk/package.json sdk/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --fetch-retries=5 --fetch-retry-maxtimeout=120000
COPY sdk/ ./
RUN npm run build

FROM node:22-alpine AS dashboard
WORKDIR /build/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --fetch-retries=5 --fetch-retry-maxtimeout=120000
COPY dashboard/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS server
WORKDIR /build/server
COPY server/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -q -B dependency:go-offline
COPY server/src ./src
# Spring Boot serves everything under static/: the dashboard at / and the SDK at /sdk.js.
COPY --from=dashboard /build/dashboard/dist/ ./src/main/resources/static/
COPY --from=sdk /build/sdk/dist/sdk.js ./src/main/resources/static/sdk.js
COPY --from=sdk /build/sdk/dist/sdk-fonts/ ./src/main/resources/static/sdk-fonts/
# The tests start their own containers through Docker, so they run with mvn test, not in the image build.
RUN --mount=type=cache,target=/root/.m2 mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S reporter && adduser -S reporter -G reporter
COPY --from=server /build/server/target/server-*.jar app.jar
USER reporter
EXPOSE 8080
# Lets the JVM size its heap from the container memory limit instead of the host's memory.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/api/v1/dashboard-config" || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
