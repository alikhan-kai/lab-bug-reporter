package com.alimberdi.server.dashboard;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DashboardPropertiesTest {

	@Test
	void splitsIssuerIntoKeycloakUrlAndRealm() {
		var properties = new DashboardProperties("https://auth.lab.example/realms/lab-bug-reporter", "lab-dashboard");

		assertThat(properties.keycloakUrl()).isEqualTo("https://auth.lab.example");
		assertThat(properties.realm()).isEqualTo("lab-bug-reporter");
	}

	@Test
	void keepsPathPrefixOfKeycloakBehindProxy() {
		var properties = new DashboardProperties("https://lab.example/auth/realms/lab", "lab-dashboard");

		assertThat(properties.keycloakUrl()).isEqualTo("https://lab.example/auth");
		assertThat(properties.realm()).isEqualTo("lab");
	}

	@Test
	void rejectsIssuerThatIsNotKeycloakRealm() {
		assertThatThrownBy(() -> new DashboardProperties("https://auth.lab.example", "lab-dashboard"))
				.isInstanceOf(IllegalStateException.class);
	}

}
