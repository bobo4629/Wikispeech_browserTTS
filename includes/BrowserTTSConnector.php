<?php

namespace MediaWiki\Wikispeech;

/**
 * Browser TTS connector that provides a Speechoid-compatible interface
 * for browser-based text-to-speech synthesis.
 *
 * @since 0.1.13
 */
class BrowserTTSConnector {

	/**
	 * Fake synthesis method for browser TTS compatibility
	 * 
	 * @since 0.1.13
	 * @param string $language
	 * @param string $voice
	 * @param array $parameters
	 * @param int|null $responseTimeoutSeconds
	 * @return array Fake response compatible with Speechoid format
	 */
	public function synthesize(
		$language,
		$voice,
		$parameters,
		$responseTimeoutSeconds = null
	): array {
		// Return a fake response that indicates browser TTS should be used
		$text = $parameters['text'] ?? $parameters['ipa'] ?? $parameters['ssml'] ?? '';
		
		return [
			'audio_data' => 'BROWSER_TTS_PLACEHOLDER',
			'tokens' => $this->generateTokensFromText( $text ),
			'browser_tts' => true,
			'language' => $language,
			'voice' => $voice
		];
	}

	/**
	 * Generate fake tokens from text for compatibility
	 * 
	 * @since 0.1.13
	 * @param string $text
	 * @return array
	 */
	private function generateTokensFromText( string $text ): array {
		$words = preg_split('/\s+/', trim($text));
		$tokens = [];
		$currentTime = 0;
		
		foreach ( $words as $word ) {
			if ( empty($word) ) continue;
			
			$duration = strlen($word) * 100; // Rough estimate: 100ms per character
			$tokens[] = [
				'orth' => $word,
				'starttime' => $currentTime,
				'endtime' => $currentTime + $duration
			];
			$currentTime += $duration + 100; // Add 100ms pause between words
		}
		
		return $tokens;
	}

	/**
	 * Fake method for browser TTS compatibility
	 * 
	 * @since 0.1.13
	 * @return array
	 */
	public function listDefaultVoicePerLanguage(): array {
		// Return common browser voices
		return [
			'en' => 'en-US',
			'sv' => 'sv-SE',
			'ar' => 'ar-SA'
		];
	}

	/**
	 * Fake method for browser TTS compatibility
	 * 
	 * @since 0.1.13
	 * @return string
	 */
	public function requestDefaultVoices(): string {
		return json_encode([
			['lang' => 'en', 'default_voice' => 'en-US'],
			['lang' => 'sv', 'default_voice' => 'sv-SE'],
			['lang' => 'ar', 'default_voice' => 'ar-SA']
		]);
	}
}
