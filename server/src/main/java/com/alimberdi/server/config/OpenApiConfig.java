package com.alimberdi.server.config;

import com.alimberdi.server.exception.ApiError;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * The API description at {@code /v3/api-docs}, with Swagger UI at {@code /swagger-ui/index.html}. It is generated
 * from the controllers, so it cannot drift from the code.
 */
@Configuration
public class OpenApiConfig {

	public static final String BEARER_SCHEME = "keycloak";

	private static final String INGEST_PATH = "/api/v1/ingest/";
	private static final String ERROR_SCHEMA = "ApiError";

	// The errors every endpoint of a kind can return, in the format of GlobalExceptionHandler (ТЗ, section 8).
	private static final Map<String, String> INGEST_ERRORS = Map.of(
			"400", "Invalid report, or no reporter identity",
			"403", "Origin not allowed for the project",
			"404", "Unknown project key",
			"413", "A file or the context is over its size limit"
	);
	private static final Map<String, String> DASHBOARD_ERRORS = Map.of(
			"400", "Invalid input",
			"401", "Missing, expired or invalid access token",
			"403", "Role too low for this action",
			"404", "Not found, or in a project the user cannot see"
	);

	@Bean
	public OpenAPI openApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Lab Bug Reporter API")
						.version("v1")
						.description("The ingest endpoint for the SDK and the dashboard API for the team."))
				.components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
						.type(SecurityScheme.Type.HTTP)
						.scheme("bearer")
						.bearerFormat("JWT")
						.description("Keycloak access token")))
				// Endpoints that need no token clear this with an empty @SecurityRequirements.
				.addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
	}

	@Bean
	public OpenApiCustomizer errorResponsesCustomizer() {
		return openApi -> {
			Schema<?> errorSchema = ModelConverters.getInstance()
					.resolveAsResolvedSchema(new AnnotatedType(ApiError.class))
					.schema;
			openApi.getComponents().addSchemas(ERROR_SCHEMA, errorSchema);

			openApi.getPaths().forEach((path, pathItem) -> pathItem.readOperations().forEach(operation -> {
				if (operation.getSecurity() != null && operation.getSecurity().isEmpty() && !path.startsWith(INGEST_PATH)) {
					return;
				}
				addErrorResponses(operation, path.startsWith(INGEST_PATH) ? INGEST_ERRORS : DASHBOARD_ERRORS);
			}));
		};
	}

	private static void addErrorResponses(Operation operation, Map<String, String> errors) {
		errors.forEach((code, description) -> operation.getResponses().putIfAbsent(code, new ApiResponse()
				.description(description)
				.content(new Content().addMediaType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE,
						new MediaType().schema(new Schema<>().$ref("#/components/schemas/" + ERROR_SCHEMA))))));
	}

}
