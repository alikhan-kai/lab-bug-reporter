package com.alimberdi.server.user;

import com.alimberdi.server.project.Project;
import com.alimberdi.server.security.CurrentUser;
import com.alimberdi.server.security.UserRole;

import java.util.List;

/** The signed-in team member, their dashboard roles and the projects they can see. */
public record MeResponse(
		String id,
		String username,
		String email,
		List<UserRole> roles,
		List<ProjectResponse> projects
) {

	public static MeResponse of(CurrentUser user, List<Project> visibleProjects) {
		return new MeResponse(
				user.id(),
				user.username(),
				user.email(),
				List.copyOf(user.roles()),
				visibleProjects.stream()
						.map(project -> new ProjectResponse(project.slug(), project.name()))
						.toList()
		);
	}

	public record ProjectResponse(
			String slug,
			String name
	) {
	}

}
