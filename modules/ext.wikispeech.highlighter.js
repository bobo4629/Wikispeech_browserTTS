/**
 * Highlighting functionality for Wikispeech
 *
 * @class ext.wikispeech.Highlighter
 * @constructor
 */

function Highlighter() {
	const self = this;
	self.currentHighlight = null;
	self.highlightTokenTimer = null;

	/**
	 * Initialize the highlighter
	 */
	this.init = function () {
		console.log( '[Wikispeech] Highlighter initialized' );
	};

	/**
	 * Highlight an utterance
	 */
	this.highlightUtterance = function ( utterance ) {
		self.clearHighlighting();
		
		if ( !utterance || !utterance.content ) {
			return;
		}

		console.log( '[Wikispeech] Highlighting utterance:', utterance );
		
		// Add highlighting class to utterance content
		utterance.content.forEach( item => {
			const node = mw.wikispeech.storage.getNodeForItem( item );
			if ( node && node.parentElement ) {
				$( node.parentElement ).addClass( 'ext-wikispeech-highlighted-utterance' );
			}
		} );
	};

	/**
	 * Start token highlighting
	 */
	this.startTokenHighlighting = function ( token ) {
		if ( !token ) {
			return;
		}

		console.log( '[Wikispeech] Starting token highlighting:', token );
		self.highlightToken( token );
	};

	/**
	 * Highlight a specific token
	 */
	this.highlightToken = function ( token ) {
		if ( !token || !token.items ) {
			return;
		}

		self.clearTokenHighlighting();

		token.items.forEach( item => {
			const node = mw.wikispeech.storage.getNodeForItem( item );
			if ( node && node.parentElement ) {
				$( node.parentElement ).addClass( 'ext-wikispeech-highlighted-token' );
			}
		} );

		self.currentHighlight = token;
	};

	/**
	 * Clear all highlighting
	 */
	this.clearHighlighting = function () {
		self.clearTokenHighlighting();
		self.clearUtteranceHighlighting();
	};

	/**
	 * Clear token highlighting
	 */
	this.clearTokenHighlighting = function () {
		$( '.ext-wikispeech-highlighted-token' ).removeClass( 'ext-wikispeech-highlighted-token' );
		self.currentHighlight = null;
	};

	/**
	 * Clear utterance highlighting
	 */
	this.clearUtteranceHighlighting = function () {
		$( '.ext-wikispeech-highlighted-utterance' ).removeClass( 'ext-wikispeech-highlighted-utterance' );
	};

	/**
	 * Clear highlight token timer
	 */
	this.clearHighlightTokenTimer = function () {
		if ( self.highlightTokenTimer ) {
			clearTimeout( self.highlightTokenTimer );
			self.highlightTokenTimer = null;
		}
	};

	/**
	 * Start highlighting with timing (for browser TTS compatibility)
	 */
	this.startHighlighting = function () {
		console.log( '[Wikispeech] Starting highlighting for browser TTS' );
		// For browser TTS, we can't sync perfectly with audio timing
		// so we just highlight the entire utterance
	};
}

mw.wikispeech = mw.wikispeech || {};
mw.wikispeech.Highlighter = Highlighter;
mw.wikispeech.highlighter = new Highlighter();
