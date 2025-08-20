/**
 * Main class for the Wikispeech extension.
 *
 * Handles setup of various components and initialization.
 *
 * @class ext.wikispeech.Main
 * @constructor
 */

function Main() {
	const self = this;

	this.init = function () {
		if ( !self.enabledForNamespace() ) {
			// TODO: This is only required for tests to run
			// properly since namespace is checked at an earlier
			// stage for production code. See T267529.
			return;
		}

		// Removed mobile frontend check - allow Wikispeech to run on mobile

		// Initialize browser TTS if enabled
		if ( mw.config.get( 'wgWikispeechUseBrowserTTS' ) ) {
			console.log( '[Wikispeech] Initializing browser TTS mode' );
			const browserTTSSuccess = mw.wikispeech.browserTTS.init();
			
			// 检查是否应该显示播放器
			if ( !mw.wikispeech.browserTTS.canShowPlayer() ) {
				console.log( '[Wikispeech] Browser TTS cannot show player, skipping UI initialization' );
				return; // 不初始化UI和播放器
			}
		}

		mw.wikispeech.selectionPlayer = new mw.wikispeech.SelectionPlayer();
		mw.wikispeech.ui.init();
		mw.wikispeech.player.init();
		
		// Initialize highlighter if it exists
		if ( mw.wikispeech.highlighter && mw.wikispeech.highlighter.init ) {
			mw.wikispeech.highlighter.init();
		}

		mw.wikispeech.storage.loadUtterances( window );
		
		// Prepare action link.
		// eslint-disable-next-line no-jquery/no-global-selector
		const $toggleVisibility = $( '.ext-wikispeech-listen a' );
		// Set label to hide message since the player is
		// visible when loaded.
		$toggleVisibility.text(
			mw.msg( 'wikispeech-dont-listen' )
		);
		$toggleVisibility.on(
			'click',
			$toggleVisibility,
			self.toggleVisibility
		);
	};

	/**
	 * Toggle the visibility of the control panel.
	 *
	 * @param {Event} event
	 */

	this.toggleVisibility = function ( event ) {
		mw.wikispeech.ui.toggleVisibility();

		let toggleVisibilityMessage;
		if ( mw.wikispeech.ui.isShown() ) {
			toggleVisibilityMessage = 'wikispeech-dont-listen';
		} else {
			toggleVisibilityMessage = 'wikispeech-listen';
		}
		const $toggleVisibility = event.data;
		// Messages that can be used here:
		// * wikispeech-listen
		// * wikispeech-dont-listen
		$toggleVisibility.text( mw.msg( toggleVisibilityMessage ) );
	};

	/**
	 * Check if Wikispeech is enabled for the current namespace.
	 *
	 * @return {boolean} true is the namespace of current page
	 *  should activate Wikispeech, else false.
	 */

	this.enabledForNamespace = function () {
		const validNamespaces = mw.config.get( 'wgWikispeechNamespaces' );
		const namespace = mw.config.get( 'wgNamespaceNumber' );
		return validNamespaces.includes( namespace );
	};

}

mw.loader.using( [ 'mediawiki.api', 'ext.wikispeech' ] ).done(
	() => {
		const main = new Main();
		main.init();
	}
);
