package com.alimberdi.server.exception;

public class OriginNotAllowedException extends RuntimeException {
	public OriginNotAllowedException(String message) {
		super(message);
	}
}
