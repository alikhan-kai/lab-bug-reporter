package com.alimberdi.server.ingest;

import com.alimberdi.server.project.ProjectRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sends CORS headers only to the origins allowed for the project in the URL. A disallowed
 * POST still reaches the service, so that the caller gets the regular JSON 403.
 */
@Component
@RequiredArgsConstructor
public class IngestCorsFilter extends OncePerRequestFilter {

	private static final Pattern INGEST_PATH = Pattern.compile("^/api/v1/ingest/([^/]+)/reports$");

	private final ProjectRegistry projectRegistry;

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain
	) throws ServletException, IOException {
		Matcher pathMatcher = INGEST_PATH.matcher(request.getRequestURI());
		if (!pathMatcher.matches()) {
			filterChain.doFilter(request, response);
			return;
		}

		String origin = request.getHeader(HttpHeaders.ORIGIN);
		boolean isAllowed = projectRegistry.findByKey(pathMatcher.group(1))
				.map(project -> project.isOriginAllowed(origin))
				.orElse(false);

		response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
		if (isAllowed) {
			response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
		}

		if (isPreflight(request)) {
			writePreflightResponse(response, isAllowed);
			return;
		}
		filterChain.doFilter(request, response);
	}

	private boolean isPreflight(HttpServletRequest request) {
		return HttpMethod.OPTIONS.matches(request.getMethod())
				&& request.getHeader(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD) != null;
	}

	private void writePreflightResponse(HttpServletResponse response, boolean isAllowed) {
		if (!isAllowed) {
			response.setStatus(HttpStatus.FORBIDDEN.value());
			return;
		}
		response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, HttpMethod.POST.name());
		response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, HttpHeaders.CONTENT_TYPE);
		response.setStatus(HttpStatus.NO_CONTENT.value());
	}

}
