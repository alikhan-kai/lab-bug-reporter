package com.alimberdi.server.project;

import com.alimberdi.server.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** Decides which projects a team member may see. */
@Service
@RequiredArgsConstructor
public class ProjectAccessService {

	private final ProjectRegistry projectRegistry;

	/** Admins see every project, everyone else the projects whose access list holds one of their roles. */
	public List<Project> findVisible(CurrentUser user) {
		return projectRegistry.findAll().stream()
				.filter(project -> user.isAdmin() || user.hasAnyTokenRole(project.access()))
				.toList();
	}

}
