package com.alimberdi.server.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import tools.jackson.databind.ObjectMapper;

/**
 * The ingest endpoint is public: the project key and origin check protect it. So are the dashboard's login
 * settings, which hold nothing secret. The rest of the API
 * needs a Keycloak access token with one of the dashboard roles.
 */
@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfig {

	private static final String ADMIN = UserRole.ADMIN.name();
	private static final String TRIAGER = UserRole.TRIAGER.name();
	private static final String VIEWER = UserRole.VIEWER.name();

	@Bean
	public SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			AuthProperties authProperties,
			ObjectMapper objectMapper
	) throws Exception {
		JsonSecurityErrorHandler errorHandler = new JsonSecurityErrorHandler(objectMapper);
		http
				// IngestCorsFilter sends the ingest CORS headers per project, and the dashboard is same-origin.
				.cors(AbstractHttpConfigurer::disable)
				// Requests authenticate only with a bearer token, never a cookie, so there is nothing to forge.
				.csrf(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(requests -> requests
						.requestMatchers("/api/v1/ingest/**").permitAll()
						// The dashboard needs the login settings before it has a token.
						.requestMatchers(HttpMethod.GET, "/api/v1/dashboard-config").permitAll()
						.requestMatchers(HttpMethod.PATCH, "/api/v1/reports/**").hasAnyRole(ADMIN, TRIAGER)
						.requestMatchers(HttpMethod.DELETE, "/api/v1/reports/**").hasRole(ADMIN)
						.requestMatchers("/api/**").hasAnyRole(ADMIN, TRIAGER, VIEWER)
						// Outside the API are only the public SDK script, the dashboard's static files and the API
						// description (/v3/api-docs, /swagger-ui), which hold nothing secret.
						.anyRequest().permitAll())
				.oauth2ResourceServer(resourceServer -> resourceServer
						.jwt(jwt -> jwt.jwtAuthenticationConverter(new TokenUserConverter(authProperties)))
						.authenticationEntryPoint(errorHandler)
						.accessDeniedHandler(errorHandler))
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint(errorHandler)
						.accessDeniedHandler(errorHandler));
		return http.build();
	}

}
