package com.alimberdi.server.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<Object> handleNotFound(ResourceNotFoundException exception) {
		return buildResponse(HttpStatus.NOT_FOUND, exception.getMessage());
	}

	@ExceptionHandler(InvalidReportException.class)
	public ResponseEntity<Object> handleInvalidReport(InvalidReportException exception) {
		return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage());
	}

	@ExceptionHandler(OriginNotAllowedException.class)
	public ResponseEntity<Object> handleOriginNotAllowed(OriginNotAllowedException exception) {
		return buildResponse(HttpStatus.FORBIDDEN, exception.getMessage());
	}

	@ExceptionHandler(PayloadTooLargeException.class)
	public ResponseEntity<Object> handlePayloadTooLarge(PayloadTooLargeException exception) {
		return buildResponse(HttpStatus.CONTENT_TOO_LARGE, exception.getMessage());
	}

	@ExceptionHandler(StorageException.class)
	public ResponseEntity<Object> handleStorage(StorageException exception) {
		log.error("Object storage request failed", exception);
		return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, "File storage is unavailable");
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Object> handleUnexpected(Exception exception) {
		log.error("Unexpected error", exception);
		return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");
	}

	/** Puts the errors Spring MVC raises itself into the same format as ours. */
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(
			Exception exception,
			Object body,
			HttpHeaders headers,
			HttpStatusCode statusCode,
			WebRequest request
	) {
		ApiError apiError = toApiError(statusCode, describe(exception));
		return ResponseEntity.status(statusCode).headers(headers).body(apiError);
	}

	private String describe(Exception exception) {
		if (exception instanceof MethodArgumentNotValidException validationException) {
			return validationException.getBindingResult().getFieldErrors().stream()
					.map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
					.collect(Collectors.joining("; "));
		}
		return exception instanceof ErrorResponse errorResponse ? errorResponse.getBody().getDetail() : "Invalid request";
	}

	private ResponseEntity<Object> buildResponse(HttpStatus status, String message) {
		return ResponseEntity.status(status).body(toApiError(status, message));
	}

	private ApiError toApiError(HttpStatusCode statusCode, String message) {
		HttpStatus status = HttpStatus.resolve(statusCode.value());
		String error = status != null ? status.getReasonPhrase() : "Error";
		return new ApiError(statusCode.value(), error, message);
	}

}
