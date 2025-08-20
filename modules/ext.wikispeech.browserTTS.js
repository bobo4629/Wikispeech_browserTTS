/**
 * Browser Text-to-Speech functionality for Wikispeech
 *
 * @since 0.1.13
 */

function BrowserTTS() {
	const self = this;
	self.synthesis = window.speechSynthesis;
	self.currentUtterance = null;
	self.voices = [];
	self.isReady = false;
	self.selectedVoice = null; // User-selected voice object
	self.currentText = null;
	self.currentLanguage = null;
	self.currentVoiceParam = null;
	self.isPausedState = false;
	self.settingsChanged = false;
	self.voicesWarningShown = false; // Flag to prevent multiple warnings
	self.shouldShowPlayer = true; // 新增：控制是否显示播放器

	/**
	 * Initialize browser TTS
	 */
	this.init = function () {
		if ( !self.synthesis ) {
			console.warn( '[Wikispeech] Browser TTS not supported' );
			self.shouldShowPlayer = false; // 不支持时不显示播放器
			self.showVoicesWarning( 'not-supported' );
			return false;
		}

		// Load voices immediately
		self.loadVoices();
		
		// Check voices immediately after loading
		self.checkVoicesAvailability();
		
		// Some browsers need time to load voices
		if ( self.synthesis.onvoiceschanged !== undefined ) {
			self.synthesis.onvoiceschanged = function() {
				self.loadVoices();
				self.isReady = true;
				console.log( '[Wikispeech] Browser TTS voices loaded:', self.voices.length );
				
				 // 重新检查语音可用性
				self.checkVoicesAvailability();
				
				// 重新加载保存的语音偏好
				if ( self.shouldShowPlayer ) {
					self.loadVoicePreference();
				}
			};
		}

		// Set ready immediately for browsers that don't need voice loading
		if ( self.voices.length > 0 || !self.synthesis.onvoiceschanged ) {
			self.isReady = true;
			console.log( '[Wikispeech] Browser TTS initialized immediately' );
		}

		 // Load saved voice preference only if we should show player
		if ( self.shouldShowPlayer ) {
			self.loadVoicePreference();
		}

		return self.shouldShowPlayer; // 返回是否应该显示播放器
	};

	/**
	 * Check voices availability and update shouldShowPlayer status
	 */
	this.checkVoicesAvailability = function () {
		if ( self.voices.length === 0 && !self.voicesWarningShown ) {
			// Give it a moment for voices to load, then check again
			setTimeout( function() {
				if ( self.voices.length === 0 && !self.voicesWarningShown ) {
					self.shouldShowPlayer = false; // 无语音时不显示播放器
					self.showVoicesWarning( 'no-voices' );
				}
			}, 1000 );
		} else if ( self.voices.length > 0 ) {
			self.shouldShowPlayer = true; // 有语音时可以显示播放器
		}
	};

	/**
	 * Check if player should be shown
	 */
	this.canShowPlayer = function () {
		return self.shouldShowPlayer;
	};

	/**
	 * Show warning dialog about voice issues
	 */
	this.showVoicesWarning = function ( type ) {
		if ( self.voicesWarningShown ) {
			return; // Don't show multiple warnings
		}
		
		self.voicesWarningShown = true;
		
		let title, message;
		if ( type === 'not-supported' ) {
			title = mw.msg( 'wikispeech-browser-tts-not-supported-title' );
			message = mw.msg( 'wikispeech-browser-tts-not-supported-message' );
		} else {
			title = mw.msg( 'wikispeech-browser-tts-no-voices-title' );
			message = mw.msg( 'wikispeech-browser-tts-no-voices-message' );
		}
		
		// Use OOUI alert dialog
		OO.ui.alert( message, { title: title, size: 'medium' } );
	};

	/**
	 * Load saved voice preference
	 */
	this.loadVoicePreference = function () {
		const savedVoiceData = localStorage.getItem( 'wikispeech-browser-tts-voice' );
		if ( savedVoiceData && self.voices.length > 0 ) {
			try {
				const voiceInfo = JSON.parse( savedVoiceData );
				const savedVoice = self.voices.find( v => 
					v.name === voiceInfo.name && v.lang === voiceInfo.lang 
				);
				if ( savedVoice ) {
					self.selectedVoice = savedVoice;
					console.log( '[Wikispeech] Loaded saved voice:', savedVoice.name, savedVoice.lang );
				} else {
					console.warn( '[Wikispeech] Saved voice not found, using default' );
					self.selectedVoice = self.getDefaultVoice();
				}
			} catch ( error ) {
				console.warn( '[Wikispeech] Failed to parse saved voice data, using default' );
				self.selectedVoice = self.getDefaultVoice();
			}
		} else {
			self.selectedVoice = self.getDefaultVoice();
			console.log( '[Wikispeech] Using default voice:', self.selectedVoice?.name, self.selectedVoice?.lang );
		}
	};

	/**
	 * Get default voice based on page language
	 */
	this.getDefaultVoice = function () {
		if ( self.voices.length === 0 ) {
			return null;
		}

		const pageLanguage = mw.config.get( 'wgPageContentLanguage' ) || 'en';
		
		// Try to find a voice that matches the page language
		let voice = self.voices.find( v => v.lang.toLowerCase() === pageLanguage.toLowerCase() );
		if ( voice ) {
			return voice;
		}

		// Try base language match
		const langCode = pageLanguage.split( '-' )[0];
		voice = self.voices.find( v => v.lang.toLowerCase().startsWith( langCode.toLowerCase() ) );
		if ( voice ) {
			return voice;
		}

		// Return first available voice as fallback
		return self.voices[0];
	};

	/**
	 * Save voice preference
	 */
	this.saveVoicePreference = function ( voice ) {
		const voiceData = {
			name: voice.name,
			lang: voice.lang
		};
		
		console.log( '[Wikispeech] Saving voice preference:', voiceData );
		localStorage.setItem( 'wikispeech-browser-tts-voice', JSON.stringify( voiceData ) );
		
		// 重要：立即更新 selectedVoice
		self.selectedVoice = voice;
		
		// 标记设置已更改，需要重新创建utterance
		self.settingsChanged = true;
		
		console.log( '[Wikispeech] Voice preference saved and selectedVoice updated' );
		
		// 验证保存是否成功
		const savedData = localStorage.getItem( 'wikispeech-browser-tts-voice' );
		console.log( '[Wikispeech] Verification - localStorage contains:', savedData );
	};

	/**
	 * Set current voice
	 */
	this.setVoice = function ( voice ) {
		console.log( '[Wikispeech] setVoice called with:', voice.name, voice.lang );
		console.log( '[Wikispeech] Previous selectedVoice was:', self.selectedVoice?.name, self.selectedVoice?.lang );
		
		self.saveVoicePreference( voice );
		
		console.log( '[Wikispeech] New selectedVoice is now:', self.selectedVoice?.name, self.selectedVoice?.lang );
		console.log( '[Wikispeech] Voice change completed' );
	};

	/**
	 * Get current voice
	 */
	this.getCurrentVoice = function () {
		// 优先返回用户选择的语音，如果没有则返回默认语音
		const current = self.selectedVoice || self.getDefaultVoice();
		console.log( '[Wikispeech] Current voice is:', current?.name, current?.lang );
		return current;
	};

	/**
	 * Get the actually selected voice (not fallback to default)
	 * 这个方法返回用户实际选择的语音，如果用户没有选择则返回null
	 */
	this.getSelectedVoice = function () {
		console.log( '[Wikispeech] Selected voice is:', self.selectedVoice?.name, self.selectedVoice?.lang );
		return self.selectedVoice;
	};

	/**
	 * Load available voices
	 */
	this.loadVoices = function () {
		self.voices = self.synthesis.getVoices();
		console.log( '[Wikispeech] Loaded voices:', self.voices.length );
	};

	/**
	 * Get available voices
	 */
	this.getAvailableVoices = function () {
		return self.voices;
	};

	/**
	 * Speak text using browser TTS
	 */
	this.speak = function ( text, language, voice ) {
		// Force initialization if not ready
		if ( !self.isReady ) {
			console.log( '[Wikispeech] Force initializing browser TTS' );
			self.init();
			
			// If still not ready, try anyway
			if ( !self.isReady ) {
				console.warn( '[Wikispeech] Browser TTS not ready, attempting to speak anyway' );
				self.isReady = true;
			}
		}

		return new Promise( ( resolve, reject ) => {
			// 如果当前有正在播放的utterance且不是暂停状态，停止它
			if ( self.currentUtterance && self.synthesis.speaking && !self.synthesis.paused ) {
				self.stop();
			}

			// 保存当前要说的文本，用于恢复播放
			self.currentText = text;
			self.currentLanguage = language;
			self.currentVoiceParam = voice;

			// 创建新的utterance
			self.currentUtterance = self.createUtterance( text, language, voice, resolve, reject );
			
			// 开始说话
			self.startSpeaking();
		} );
	};

	/**
	 * Create a new utterance with current settings
	 */
	this.createUtterance = function ( text, language, voice, resolve, reject ) {
		const utterance = new SpeechSynthesisUtterance( text );
		
		// Use selected voice, provided voice, or find suitable voice
		let selectedVoice = voice || self.selectedVoice;
		if ( !selectedVoice ) {
			selectedVoice = self.getDefaultVoice();
		}
		
		if ( selectedVoice ) {
			utterance.voice = selectedVoice;
			utterance.lang = selectedVoice.lang;
			console.log( '[Wikispeech] Using voice:', selectedVoice.name, 'for language:', selectedVoice.lang );
		} else {
			// Fallback to language parameter if no voice found
			utterance.lang = language || 'en';
			console.warn( '[Wikispeech] No voice available, using language:', utterance.lang );
		}
		
		// Get user speech rate (重新获取最新的速度设置)
		const speechRate = parseFloat( mw.user.options.get( 'wikispeechSpeechRate' ) ) || 1.0;
		utterance.rate = speechRate;
		
		// Set volume to ensure audio is audible
		utterance.volume = 1.0;
		utterance.pitch = 1.0;

		// Flag to track if utterance was intentionally stopped
		utterance._wikispeechStopped = false;

		utterance.onstart = function () {
			console.log( '[Wikispeech] Browser TTS started speaking' );
			self.isPausedState = false;
		};

		utterance.onend = function () {
			console.log( '[Wikispeech] Browser TTS finished speaking' );
			self.currentUtterance = null;
			self.currentText = null;
			self.isPausedState = false;
			if ( !utterance._wikispeechStopped && resolve ) {
				resolve();
			}
		};

		utterance.onerror = function ( event ) {
			// Don't log errors if the utterance was intentionally stopped
			if ( utterance._wikispeechStopped || event.error === 'interrupted' ) {
				console.log( '[Wikispeech] Browser TTS intentionally stopped' );
				self.currentUtterance = null;
				self.currentText = null;
				self.isPausedState = false;
				if ( resolve ) {
					resolve(); // Resolve instead of reject for intentional stops
				}
				return;
			}
			
			console.error( '[Wikispeech] Browser TTS error:', event );
			self.currentUtterance = null;
			self.currentText = null;
			self.isPausedState = false;
			if ( reject ) {
				reject( event );
			}
		};

		return utterance;
	};

	/**
	 * Start speaking the current utterance
	 */
	this.startSpeaking = function () {
		if ( !self.currentUtterance ) {
			console.warn( '[Wikispeech] No utterance to speak' );
			return;
		}

		try {
			console.log( '[Wikispeech] Starting speech synthesis' );
			
			// Ensure speech synthesis is ready
			if ( self.synthesis.paused ) {
				self.synthesis.resume();
			}
			
			self.synthesis.speak( self.currentUtterance );
			
			// Some browsers need a small delay to start speaking
			setTimeout( () => {
				if ( !self.synthesis.speaking && !self.synthesis.paused ) {
					console.warn( '[Wikispeech] Speech synthesis may not have started, trying again...' );
					self.synthesis.speak( self.currentUtterance );
				}
			}, 100 );
			
		} catch ( error ) {
			console.error( '[Wikispeech] Failed to start speech synthesis:', error );
			self.currentUtterance = null;
			self.currentText = null;
			throw error;
		}
	};

	/**
	 * Stop current speech
	 */
	this.stop = function () {
		if ( self.currentUtterance ) {
			// Mark the utterance as intentionally stopped
			self.currentUtterance._wikispeechStopped = true;
		}
		
		if ( self.synthesis.speaking ) {
			self.synthesis.cancel();
		}
		
		self.currentUtterance = null;
		self.currentText = null;
		self.isPausedState = false;
		self.settingsChanged = false;
	};

	/**
	 * Pause current speech
	 */
	this.pause = function () {
		if ( self.synthesis.speaking && !self.synthesis.paused ) {
			self.synthesis.pause();
			self.isPausedState = true;
			console.log( '[Wikispeech] Speech paused' );
		}
	};

	/**
	 * Resume paused speech or restart if settings changed
	 */
	this.resume = function () {
		if ( self.isPausedState ) {
			// 检查设置是否已更改
			if ( self.settingsChanged && self.currentText ) {
				console.log( '[Wikispeech] Settings changed, recreating utterance for resume' );
				
				// 停止当前的utterance
				self.synthesis.cancel();
				
				// 重新创建utterance
				self.currentUtterance = self.createUtterance( 
					self.currentText, 
					self.currentLanguage, 
					self.currentVoiceParam,
					null, // 不需要resolve/reject回调
					null
				);
				
				// 重新开始播放
				self.startSpeaking();
				self.settingsChanged = false;
			} else if ( self.synthesis.paused ) {
				// 正常恢复播放
				self.synthesis.resume();
				self.isPausedState = false;
				console.log( '[Wikispeech] Speech resumed' );
			}
		}
	};

	/**
	 * Check if currently speaking
	 */
	this.isSpeaking = function () {
		return self.synthesis.speaking;
	};

	/**
	 * Check if paused
	 */
	this.isPaused = function () {
		return self.isPausedState || self.synthesis.paused;
	};
}

mw.wikispeech = mw.wikispeech || {};
mw.wikispeech.BrowserTTS = BrowserTTS;
mw.wikispeech.browserTTS = new BrowserTTS();
