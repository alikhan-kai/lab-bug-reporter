package com.alimberdi.server.user;

import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/me")
public class MeController {

	private final ProjectAccessService projectAccessService;

	@GetMapping
	public MeResponse getCurrentUser(@AuthenticationPrincipal CurrentUser user) {
		return MeResponse.of(user, projectAccessService.findVisible(user));
	}

}
