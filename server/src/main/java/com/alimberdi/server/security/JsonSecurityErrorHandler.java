package com.alimberdi.server.security;

import com.alimberdi.server.exception.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * Answers requests that Spring Security rejects in the same JSON format as the rest of the API.
 * These rejections happen in the filter chain, before {@code GlobalExceptionHandler} can see them.
 */
@RequiredArgsConstructor
public class JsonSecurityErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

	private static final String BEARER_CHALLENGE = "Bearer";

	private final ObjectMapper objectMapper;

	@Override
	public void commence(
			HttpServletRequest request,
			HttpServletResponse response,
			AuthenticationException exception
	) throws IOException {
		response.setHeader(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE);
		write(response, HttpStatus.UNAUTHORIZED, "Missing or invalid access token");
	}

	@Override
	public void handle(
			HttpServletRequest request,
			HttpServletResponse response,
			AccessDeniedException exception
	) throws IOException {
		write(response, HttpStatus.FORBIDDEN, "Your role does not allow this action");
	}

	private void write(HttpServletResponse response, HttpStatus status, String message) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getOutputStream(), new ApiError(status.value(), status.getReasonPhrase(), message));
	}

}
