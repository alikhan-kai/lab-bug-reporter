package com.alimberdi.server.config;

import com.alimberdi.server.report.ReportStatus;
import com.alimberdi.server.report.ReportType;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Locale;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	// Query parameters take the same lowercase values as the JSON, for example ?status=in_progress.
	@Override
	public void addFormatters(FormatterRegistry registry) {
		registry.addConverter(String.class, ReportStatus.class, value -> ReportStatus.valueOf(value.toUpperCase(Locale.ROOT)));
		registry.addConverter(String.class, ReportType.class, value -> ReportType.valueOf(value.toUpperCase(Locale.ROOT)));
	}

	// The widget on a lab website loads its font from here, and browsers fetch fonts from another origin only with
	// CORS. The files are public, so any origin may read them.
	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/sdk-fonts/**").allowedOrigins("*").allowedMethods("GET");
	}

}
