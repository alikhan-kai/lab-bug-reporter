package com.alimberdi.server.user;

import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/me")
@Tag(name = "Current user")
public class MeController {

	private final ProjectAccessService projectAccessService;

	@Operation(summary = "The signed-in user, their roles and the projects they can see")
	@GetMapping
	public MeResponse getCurrentUser(@Parameter(hidden = true) @AuthenticationPrincipal CurrentUser user) {
		return MeResponse.of(user, projectAccessService.findVisible(user));
	}

}
