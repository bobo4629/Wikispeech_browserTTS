<?php

use MediaWiki\MediaWikiServices;
use MediaWiki\Wikispeech\Lexicon\ConfiguredLexiconStorage;
use MediaWiki\Wikispeech\Lexicon\LexiconHandler;
use MediaWiki\Wikispeech\Lexicon\LexiconSpeechoidStorage;
use MediaWiki\Wikispeech\Lexicon\LexiconWanCacheStorage;
use MediaWiki\Wikispeech\Lexicon\LexiconWikiStorage;
use MediaWiki\Wikispeech\SpeechoidConnector;
use MediaWiki\Wikispeech\Utterance\UtteranceGenerator;
use MediaWiki\Wikispeech\WikispeechServices;

/** @phpcs-require-sorted-array */
return [
	'Wikispeech.ConfiguredLexiconStorage' => static function (
		MediaWikiServices $services
	): ConfiguredLexiconStorage {
		return new ConfiguredLexiconStorage(
			$services->getConfigFactory()
				->makeConfig( 'wikispeech' )
				->get( 'WikispeechPronunciationLexiconConfiguration' ),
			$services
		);
	},
	'Wikispeech.LexiconHandler' => static function ( MediaWikiServices $services ): LexiconHandler {
		return new LexiconHandler(
			WikispeechServices::getLexiconSpeechoidStorage(),
			WikispeechServices::getLexiconWanCacheStorage()
		);
	},
	'Wikispeech.LexiconSpeechoidStorage' => static function ( MediaWikiServices $services ): LexiconSpeechoidStorage {
		return new LexiconSpeechoidStorage(
			WikispeechServices::getSpeechoidConnector(),
			$services->getMainWANObjectCache()
		);
	},
	'Wikispeech.LexiconWanCacheStorage' => static function ( MediaWikiServices $services ): LexiconWanCacheStorage {
		return new LexiconWanCacheStorage(
			$services->getMainWANObjectCache()
		);
	},
	'Wikispeech.LexiconWikiStorage' => static function ( MediaWikiServices $services ): LexiconWikiStorage {
		return new LexiconWikiStorage(
			RequestContext::getMain()->getUser()
		);
	},
	'Wikispeech.SpeechoidConnector' => static function ( MediaWikiServices $services ): SpeechoidConnector {
		$config = $services->getConfigFactory()->makeConfig( 'wikispeech' );
		$useBrowserTTS = $config->get( 'WikispeechUseBrowserTTS' );
		
		if ( $useBrowserTTS ) {
			// Return a mock SpeechoidConnector for browser TTS compatibility
			return new class( $services->getMainConfig(), $services->getHttpRequestFactory() ) extends SpeechoidConnector {
				private $browserConnector;
				
				public function __construct( $config, $requestFactory ) {
					// Don't call parent constructor to avoid Speechoid URL validation
					$this->browserConnector = new \MediaWiki\Wikispeech\BrowserTTSConnector();
				}
				
				public function synthesize( $language, $voice, $parameters, $responseTimeoutSeconds = null ): array {
					return $this->browserConnector->synthesize( $language, $voice, $parameters, $responseTimeoutSeconds );
				}
				
				public function listDefaultVoicePerLanguage(): array {
					return $this->browserConnector->listDefaultVoicePerLanguage();
				}
				
				public function requestDefaultVoices(): string {
					return $this->browserConnector->requestDefaultVoices();
				}
			};
		}
		
		return new SpeechoidConnector(
			$services->getMainConfig(),
			$services->getHttpRequestFactory()
		);
	},
	'Wikispeech.UtteranceGenerator' => static function ( MediaWikiServices $services ): UtteranceGenerator {
		return new UtteranceGenerator( $services->get( 'Wikispeech.SpeechoidConnector' ) );
	}
];
