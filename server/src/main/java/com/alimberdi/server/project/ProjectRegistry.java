package com.alimberdi.server.project;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Holds the projects read from the projects file on startup. */
@Component
public class ProjectRegistry {

	private final List<Project> projects;
	private final Map<String, Project> projectsByKey;

	public ProjectRegistry(ResourceLoader resourceLoader, @Value("${app.projects-file}") String projectsFile) {
		Resource resource = resourceLoader.getResource(projectsFile);
		projects = List.copyOf(readProjects(resource));
		projectsByKey = projects.stream()
				.collect(Collectors.toUnmodifiableMap(Project::key, Function.identity()));
	}

	public Optional<Project> findByKey(String projectKey) {
		return Optional.ofNullable(projectsByKey.get(projectKey));
	}

	/** Returns the projects in the order of the projects file. */
	public List<Project> findAll() {
		return projects;
	}

	private List<Project> readProjects(Resource resource) {
		try {
			var propertySources = new YamlPropertySourceLoader().load("projects", resource);
			return new Binder(ConfigurationPropertySources.from(propertySources))
					.bind("projects", Bindable.listOf(Project.class))
					.orElseThrow(() -> new IllegalStateException("No projects defined in " + resource));
		} catch (IOException exception) {
			throw new IllegalStateException("Cannot read projects file " + resource, exception);
		}
	}

}
