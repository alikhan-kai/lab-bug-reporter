package com.alimberdi.server.report;

import com.alimberdi.server.exception.RangeNotSatisfiableException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ByteRangeTest {

	private static final long FILE_SIZE = 1000;

	@Test
	void takesTheWholeFileWithoutRangeHeader() {
		ByteRange range = ByteRange.of(null, FILE_SIZE);

		assertThat(range).isEqualTo(new ByteRange(0, 999, FILE_SIZE, false));
		assertThat(range.length()).isEqualTo(FILE_SIZE);
	}

	@Test
	void readsAnOpenEndedRangeAsTheRestOfTheFile() {
		ByteRange range = ByteRange.of("bytes=200-", FILE_SIZE);

		assertThat(range).isEqualTo(new ByteRange(200, 999, FILE_SIZE, true));
		assertThat(range.length()).isEqualTo(800);
	}

	@Test
	void cutsARangeThatEndsPastTheFile() {
		assertThat(ByteRange.of("bytes=900-5000", FILE_SIZE)).isEqualTo(new ByteRange(900, 999, FILE_SIZE, true));
	}

	@Test
	void readsASuffixRangeAsTheLastBytes() {
		assertThat(ByteRange.of("bytes=-100", FILE_SIZE)).isEqualTo(new ByteRange(900, 999, FILE_SIZE, true));
	}

	@Test
	void sendsOnlyTheFirstOfSeveralRanges() {
		assertThat(ByteRange.of("bytes=0-9, 20-29", FILE_SIZE)).isEqualTo(new ByteRange(0, 9, FILE_SIZE, true));
	}

	@Test
	void rejectsRangeThatStartsPastTheFile() {
		assertThatThrownBy(() -> ByteRange.of("bytes=1000-", FILE_SIZE))
				.isInstanceOf(RangeNotSatisfiableException.class);
	}

	@Test
	void rejectsMalformedRangeHeader() {
		assertThatThrownBy(() -> ByteRange.of("items=0-10", FILE_SIZE))
				.isInstanceOf(RangeNotSatisfiableException.class);
	}

	@Test
	void hasNoBytesForAnEmptyFile() {
		assertThat(ByteRange.of(null, 0).length()).isZero();
	}

}
