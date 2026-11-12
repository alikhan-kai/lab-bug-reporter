package com.alimberdi.server.report;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AttachmentMediaTypeTest {

	@Test
	void keepsAValidType() {
		assertThat(AttachmentMediaType.of("video/webm;codecs=vp8")).hasToString("video/webm;codecs=vp8");
		assertThat(AttachmentMediaType.of("image/png")).hasToString("image/png");
	}

	@Test
	void quotesTheCodecsChromeRecordsWithSound() {
		assertThat(AttachmentMediaType.of("video/webm;codecs=vp8,opus")).hasToString("video/webm;codecs=\"vp8,opus\"");
	}

	@Test
	void fallsBackToTheTypeWithoutParameters() {
		assertThat(AttachmentMediaType.of("video/webm;bad param=x,y")).hasToString("video/webm");
	}

}
