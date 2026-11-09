package com.alimberdi.server.report;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;

/** The logged-in user as sent by the website. Stored as is and treated as unverified. */
public record ReporterPayload(
		@Size(max = 255) String id,
		@Size(max = 255) String email
) {

	@AssertTrue(message = "reporter must have an id or an email")
	public boolean isIdentified() {
		return (id != null && !id.isBlank()) || (email != null && !email.isBlank());
	}

}
