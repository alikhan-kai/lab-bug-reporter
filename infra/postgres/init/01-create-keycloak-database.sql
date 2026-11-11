-- Keycloak keeps its realm, users and sessions in its own database next to the reports one.
-- Postgres runs this only when it creates a new data volume.
CREATE DATABASE keycloak;
