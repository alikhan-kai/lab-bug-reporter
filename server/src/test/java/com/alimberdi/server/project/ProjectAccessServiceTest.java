package com.alimberdi.server.project;

import com.alimberdi.server.security.CurrentUser;
import com.alimberdi.server.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectAccessServiceTest {

	private final ProjectAccessService projectAccessService = new ProjectAccessService(
			new ProjectRegistry(new DefaultResourceLoader(), "classpath:projects-dev.yaml")
	);

	@Test
	void adminSeesEveryProject() {
		CurrentUser admin = user(Set.of(UserRole.ADMIN), Set.of("admin"));

		assertThat(projectAccessService.findVisible(admin)).extracting(Project::slug)
				.containsExactly("demo", "admin-only");
	}

	@Test
	void triagerSeesOnlyProjectsGrantedByTheirRoles() {
		CurrentUser triager = user(Set.of(UserRole.TRIAGER), Set.of("triager", "team-demo"));

		assertThat(projectAccessService.findVisible(triager)).extracting(Project::slug)
				.containsExactly("demo");
	}

	@Test
	void userWithoutProjectRolesSeesNothing() {
		CurrentUser viewer = user(Set.of(UserRole.VIEWER), Set.of("viewer"));

		assertThat(projectAccessService.findVisible(viewer)).isEmpty();
	}

	private CurrentUser user(Set<UserRole> roles, Set<String> tokenRoles) {
		return new CurrentUser("user-1", "user", "user@lab.example", roles, tokenRoles);
	}

}
