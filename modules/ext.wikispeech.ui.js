/**
 * Creates and controls the UI for the extension.
 *
 * @class ext.wikispeech.Ui
 * @constructor
 */

function Ui() {
	const self = this;
	// Resolves the UI is ready to be extended by consumer.
	self.ready = $.Deferred();

	/**
	 * Initialize elements and functionality for the UI.
	 */

	this.init = function () {
		self.addSelectionPlayer();
		self.addControlPanel();
		self.addKeyboardShortcuts();
		self.windowManager = new OO.ui.WindowManager();
		self.addDialogs();
		self.ready.resolve();
	};

	/**
	 * Add a panel with controls for for Wikispeech.
	 *
	 * The panel contains buttons for controlling playback and
	 * links to related pages.
	 */

	this.addControlPanel = function () {
		const toolFactory = new OO.ui.ToolFactory();
		const toolGroupFactory = new OO.ui.ToolGroupFactory();
		self.toolbar = new OO.ui.Toolbar(
			toolFactory,
			toolGroupFactory,
			{
				actions: true,
				classes: [ 'ext-wikispeech-control-panel' ],
				position: 'bottom'
			}
		);

		const playerGroup = self.addToolbarGroup();
		self.addButton(
			playerGroup,
			'previous',
			mw.wikispeech.player.skipBackUtterance,
			mw.msg( 'wikispeech-skip-back' )
		);
		self.playPauseButton = self.addButton(
			playerGroup,
			'play',
			mw.wikispeech.player.playOrPause,
			mw.msg( 'wikispeech-play' )
		);
		self.addButton(
			playerGroup,
			'stop',
			mw.wikispeech.player.stop,
			mw.msg( 'wikispeech-stop' )
		);
		self.addButton(
			playerGroup,
			'next',
			mw.wikispeech.player.skipAheadUtterance,
			mw.msg( 'wikispeech-skip-ahead' )
		);

		// Add settings button for browser TTS
		if ( mw.config.get( 'wgWikispeechUseBrowserTTS' ) ) {
			self.addButton(
				playerGroup,
				'settings',
				self.showLanguageSettings,
				mw.msg( 'wikispeech-settings' )
			);
		}

		const api = new mw.Api();
		api.getUserInfo()
			.done( ( info ) => {
				const canEditLexicon = info.rights.includes( 'wikispeech-edit-lexicon' );
				if ( !canEditLexicon ) {
					return;
				}

				self.addEditButton();
			} );

		$( document.body ).append( self.toolbar.$element );
		self.toolbar.initialize();

		// Add extra padding at the bottom of the page to not have
		// the player cover anything.
		const height = self.toolbar.$element.height();
		self.$playerFooter = $( '<div>' )
			.height( height )
			// A bit of CSS is needed to make it interact properly
			// with the other floating elements in the footer.
			.css( {
				float: 'left',
				width: '100%'
			} )
			.appendTo( '#footer' );
		self.addBufferingIcon();
	};

	/**
	 * Add button that takes the user to the lexicon editor.
	 *
	 * @param {string} If given, this is used to build the URL for
	 *  the editor page. It should be the URL to the script
	 *  endpoint of a wiki, i.e. "...index.php". If not given the
	 *  link will go to the page on the local wiki.
	 */

	this.addEditButton = function ( scriptUrl ) {
		let editUrl;
		if ( scriptUrl ) {
			editUrl = scriptUrl;
		} else {
			editUrl = mw.config.get( 'wgScript' );
		}
		editUrl += '?' + new URLSearchParams( {
			title: 'Special:EditLexicon',
			language: mw.config.get( 'wgPageContentLanguage' ),
			page: mw.config.get( 'wgArticleId' )
		} );
		self.addButton(
			self.linkGroup,
			'edit',
			editUrl,
			mw.msg( 'wikispeech-edit-lexicon-btn' ),
			null,
			'wikispeech-edit'
		);
	};

	/**
	 * Add a group to the player toolbar.
	 *
	 * @return {OO.ui.ButtonGroupWidget}
	 */

	this.addToolbarGroup = function () {
		const group = new OO.ui.ButtonGroupWidget();
		self.toolbar.$actions.append( group.$element );
		return group;
	};

	/**
	 * Add a control button.
	 *
	 * @param {OO.ui.ButtonGroupWidget} group Group to add button to.
	 * @param {string} icon Name of button icon.
	 * @param {Function|string} onClick Function to call or link.
	 * @param {string} ariaLabel Aria-labels
	 * @param {string[]} classes Classes to add to the button.
	 * @param {string} id Id to add to the button.
	 * @return {OO.ui.ButtonWidget}
	 */

	this.addButton = function ( group, icon, onClick, ariaLabel, classes, id ) {
		// eslint-disable-next-line mediawiki/class-doc
		const button = new OO.ui.ButtonWidget( {
			icon: icon,
			classes: classes,
			id: id
		} );
		if ( typeof onClick === 'function' ) {
			button.on( 'click', onClick );
		} else if ( typeof onClick === 'string' ) {
			button.setHref( onClick );
			// Open link in new tab or window.
			button.setTarget( '_blank' );
		}
		if ( ariaLabel ) {
			button.$element.find( 'a' ).attr( 'aria-label', ariaLabel );
		}
		group.addItems( [ button ] );
		return button;
	};

	/**
	 * Add buffering icon to the play/pause button.
	 *
	 * The icon shows when the waiting for audio to play.
	 */
	this.addBufferingIcon = function () {
		const $playPauseButtons = $().add( self.playPauseButton.$element ).add( self.selectionPlayer.$element );
		const $containers = $( '<span>' )
			.addClass( 'ext-wikispeech-buffering-icon-container' )
			.appendTo( ( $playPauseButtons ).find( '.oo-ui-iconElement-icon' ) );
		self.$bufferingIcons = $( '<span>' )
			.addClass( 'ext-wikispeech-buffering-icon' )
			.appendTo( $containers )
			.hide();
	};

	/**
	 * Hide the buffering icon.
	 */

	this.hideBufferingIcon = function () {
		self.$bufferingIcons.hide();
	};

	/**
	 * Show the buffering icon if the current audio is loading.
	 */

	this.showBufferingIconIfAudioIsLoading = function ( audio ) {
		if ( self.audioIsReady( audio ) ) {
			self.hideBufferingIcon();
		} else {
			$( audio ).on( 'canplay', () => {
				self.hideBufferingIcon();
			} );
			self.$bufferingIcons.show();
		}
	};

	/**
	 * Check if the current audio is ready to play.
	 *
	 * The audio is deemed ready to play as soon as any playable
	 * data is available.
	 *
	 * @param {HTMLElement} audio The audio element to test.
	 * @return {boolean} True if the audio is ready to play else false.
	 */

	this.audioIsReady = function ( audio ) {
		return audio.readyState >= 2;
	};

	/**
	 * Remove canplay listener for the audio to hide buffering icon.
	 *
	 * @param {jQuery} $audioElement Audio element from which the
	 *  listener is removed.
	 */

	this.removeCanPlayListener = function ( $audioElement ) {
		$audioElement.off( 'canplay' );
	};

	/**
	 * Change the icon of the play/pause button to pause.
	 */

	this.setPlayPauseIconToPause = function () {
		self.playPauseButton.setIcon( 'pause' );
		self.playPauseButton.$element.find( 'a' ).attr( 'aria-label', mw.msg( 'wikispeech-pause' ) );
	};

	/**
	 * Change the icon of the play/pause button to play.
	 */

	this.setAllPlayerIconsToPlay = function () {
		self.playPauseButton.setIcon( 'play' );
		self.playPauseButton.$element.find( 'a' ).attr( 'aria-label', mw.msg( 'wikispeech-play' ) );
		self.selectionPlayer.setIcon( 'play' );
	};

	/**
	 * Change the icon of the selectionPlayer to stop.
	 */

	this.setSelectionPlayerIconToStop = function () {
		self.selectionPlayer.setIcon( 'stop' );
	};
	/**
	 * Add a button that takes the user to another page.
	 *
	 * The button gets the link destination from a supplied
	 * config variable. If the variable isn't specified, the button
	 * isn't added.
	 *
	 * @param {OO.ui.ButtonGroupWidget} group Group to add button to.
	 * @param {string} icon Name of button icon.
	 * @param {string} configVariable The config variable to get
	 * @param {string} ariaLabel Aria-label
	 *  link destination from.
	 */

	this.addLinkConfigButton = function ( group, icon, configVariable, ariaLabel ) {
		const url = mw.config.get( configVariable );
		if ( url ) {
			self.addButton( group, icon, url, ariaLabel );
		}
	};

	/**
	 * Add a small player that appears when text is selected.
	 */

	this.addSelectionPlayer = function () {
		self.selectionPlayer = new OO.ui.ButtonWidget( {
			icon: 'play',
			classes: [
				'ext-wikispeech-selection-player'
			]
		} )
			.on( 'click', mw.wikispeech.player.playOrStop );
		self.selectionPlayer.toggle( false );
		$( document.body ).append( self.selectionPlayer.$element );
		$( document ).on( 'mouseup', () => {
			if (
				self.isShown() &&
				mw.wikispeech.selectionPlayer.isSelectionValid()
			) {
				self.showSelectionPlayer();
			} else {
				self.selectionPlayer.toggle( false );
			}
		} );
		$( document ).on( 'click', () => {
			// A click listener is also needed because of the
			// order of events when text is deselected by clicking
			// it.
			if ( !mw.wikispeech.selectionPlayer.isSelectionValid() ) {
				self.selectionPlayer.toggle( false );
			}
		} );
	};

	/**
	 * Check if control panel is shown
	 *
	 * @return {boolean} Visibility of control panel.
	 */

	this.isShown = function () {
		return self.toolbar.isVisible();
	};

	/**
	 * Show the selection player below the end of the selection.
	 */

	this.showSelectionPlayer = function () {

		self.selectionPlayer.toggle( true );
		const selection = window.getSelection();
		const lastRange = selection.getRangeAt( selection.rangeCount - 1 );
		const lastRect =
			mw.wikispeech.util.getLast( lastRange.getClientRects() );

		// Place the player under the end of the selected text.
		let left;
		if ( self.getTextDirection( lastRange.endContainer ) === 'rtl' ) {
			// For RTL languages, the end of the text is the far left.
			left = lastRect.left + $( document ).scrollLeft();
		} else {
			// For LTR languages, the end of the text is the far
			// right. This is the default value for the direction
			// property.
			left =
				lastRect.right +
				$( document ).scrollLeft() -
				self.selectionPlayer.$element.width();
		}
		const top = lastRect.bottom + $( document ).scrollTop();
		self.selectionPlayer.$element.css( {
			left: left + 'px',
			top: top + 'px'
		} );
	};

	/**
	 * Get the text direction for a node.
	 *
	 * @return {string} The CSS value of the `direction` property
	 *  for the node, or for its parent if it is a text node.
	 */

	this.getTextDirection = function ( node ) {
		if ( node.nodeType === 3 ) {
			// For text nodes, get the property of the parent element.
			return $( node ).parent().css( 'direction' );
		} else {
			return $( node ).css( 'direction' );
		}
	};

	/**
	 * Register listeners for keyboard shortcuts.
	 */

	this.addKeyboardShortcuts = function () {
		const shortcuts = mw.config.get( 'wgWikispeechKeyboardShortcuts' );
		$( document ).on( 'keydown', ( event ) => {
			if ( self.eventMatchShortcut( event, shortcuts.playPause ) ) {
				mw.wikispeech.player.playOrPause();
				return false;
			} else if (
				self.eventMatchShortcut(
					event,
					shortcuts.stop
				)
			) {
				mw.wikispeech.player.stop();
				return false;
			} else if (
				self.eventMatchShortcut(
					event,
					shortcuts.skipAheadSentence
				)
			) {
				mw.wikispeech.player.skipAheadUtterance();
				return false;
			} else if (
				self.eventMatchShortcut(
					event,
					shortcuts.skipBackSentence
				)
			) {
				mw.wikispeech.player.skipBackUtterance();
				return false;
			} else if (
				self.eventMatchShortcut( event, shortcuts.skipAheadWord )
			) {
				mw.wikispeech.player.skipAheadToken();
				return false;
			} else if (
				self.eventMatchShortcut( event, shortcuts.skipBackWord )
			) {
				mw.wikispeech.player.skipBackToken();
				return false;
			}
		} );
		// Prevent keyup events from triggering if there is
		// keydown event for the same key combination. This caused
		// buttons in focus to trigger if a shortcut had space as
		// key.
		$( document ).on( 'keyup', ( event ) => {
			for ( const name in shortcuts ) {
				const shortcut = shortcuts[ name ];
				if ( self.eventMatchShortcut( event, shortcut ) ) {
					event.preventDefault();
				}
			}
		} );
	};

	/**
	 * Check if a keydown event matches a shortcut from the
	 * configuration.
	 *
	 * Compare the key and modifier state (of ctrl, alt and shift)
	 * for an event, to those of a shortcut from the
	 * configuration.
	 *
	 * @param {Event} event The event to compare.
	 * @param {Object} shortcut The shortcut object from the
	 *  config to compare to.
	 * @return {boolean} true if key and all the modifiers match
	 *  with the shortcut, else false.
	 */

	this.eventMatchShortcut = function ( event, shortcut ) {
		return event.which === shortcut.key &&
			event.ctrlKey === shortcut.modifiers.includes( 'ctrl' ) &&
			event.altKey === shortcut.modifiers.includes( 'alt' ) &&
			event.shiftKey === shortcut.modifiers.includes( 'shift' );
	};

	/**
	 * Create dialogs and add them to a window manager
	 */

	this.addDialogs = function () {
		$( document.body ).append( self.windowManager.$element );
		self.messageDialog = new OO.ui.MessageDialog();
		self.errorLoadAudioDialogData = {
			title: mw.msg( 'wikispeech-error-loading-audio-title' ),
			message: mw.msg( 'wikispeech-error-loading-audio-message' ),
			actions: [
				{
					action: 'retry',
					label: mw.msg( 'wikispeech-retry' ),
					flags: 'primary'
				},
				{
					action: 'stop',
					label: mw.msg( 'wikispeech-stop' ),
					flags: 'destructive'
				}
			]
		};
		self.addWindow( self.messageDialog );
	};

	/**
	 * Add a window to the window manager.
	 *
	 * @param {OO.ui.Window} window
	 */

	this.addWindow = function ( window ) {
		self.windowManager.addWindows( [ window ] );
	};

	/**
	 * Toggle GUI visibility
	 *
	 * Hides or shows control panel which also dictates whether
	 * the selection player should be shown.
	 */

	this.toggleVisibility = function () {
		if ( self.isShown() ) {
			self.toolbar.toggle( false );
			self.selectionPlayer.toggle( false );
			self.$playerFooter.hide();
		} else {
			self.toolbar.toggle( true );
			self.selectionPlayer.toggle( true );
			self.$playerFooter.show();
		}
	};

	/**
	 * Show an error dialog for when audio could not be loaded
	 *
	 * Has buttons for retrying and stopping playback.
	 *
	 * @return {jQuery.Promise} Resolves when dialog is closed.
	 */

	this.showLoadAudioError = function () {
		return self.openWindow(
			self.messageDialog,
			self.errorLoadAudioDialogData
		);
	};

	/**
	 * Open a window.
	 *
	 * @param {OO.ui.Window} window
	 * @param {Object} data
	 * @return {jQuery.Promise} Resolves when window is closed.
	 */

	this.openWindow = function ( window, data ) {
		return self.windowManager.openWindow( window, data ).closed;
	};

	/**
	 * Create the player control buttons.
	 *
	 * @return {jQuery} A `div` containing the control buttons.
	 */

	this.createControlButtons = function () {
		const $controlButtonsContainer = $(
			'<div></div>'
		).addClass( 'ext-wikispeech-control-buttons' );
		self.addControlButton(
			$controlButtonsContainer,
			'ext-wikispeech-skip-back-sentence',
			'wikispeech-skip-back',
			mw.wikispeech.player.skipBackUtterance
		);
		self.addControlButton(
			$controlButtonsContainer,
			'ext-wikispeech-play-pause',
			'wikispeech-play',
			mw.wikispeech.player.playOrPause
		);
		self.addControlButton(
			$controlButtonsContainer,
			'ext-wikispeech-stop',
			'wikispeech-stop',
			mw.wikispeech.player.stop
		);
		self.addControlButton(
			$controlButtonsContainer,
			'ext-wikispeech-skip-ahead-sentence',
			'wikispeech-skip-ahead',
			mw.wikispeech.player.skipAheadUtterance
		);
		return $controlButtonsContainer;
	};

	/**
	 * Add player to the page.
	 *
	 * Creates the UI and adds it to the top of the content.
	 */

	this.addPlayer = function () {
		if ( $( '.ext-wikispeech-player' ).length ) {
			// There is already a player on the page.
			return;
		}
		const $content = $( mw.config.get( 'wgWikispeechContentSelector' ) );
		const $player = self.createPlayer();
		$content.prepend( $player );
		if ( !self.userCanEdit() ) {
			$( '.ext-wikispeech-edit-lexicon-btn' ).hide();
		}
	};

	/**
	 * Show language settings dialog
	 */
	this.showLanguageSettings = function () {
		if ( !mw.config.get( 'wgWikispeechUseBrowserTTS' ) ) {
			return;
			}

		// 记录工具栏的显示状态
		const wasToolbarVisible = self.toolbar.isVisible();
		
		// 移除当前焦点以避免ARIA冲突
		if ( document.activeElement ) {
			document.activeElement.blur();
		}
		
		// 稍等一下再隐藏工具栏，确保焦点已经移除
		setTimeout(() => {
			if ( wasToolbarVisible ) {
				self.toolbar.toggle( false );
			}
			
			// 在工具栏隐藏后继续执行对话框逻辑
			self.createAndShowLanguageDialog( wasToolbarVisible );
		}, 50);
	};

	/**
	 * Create and show language settings dialog
	 */
	this.createAndShowLanguageDialog = function ( wasToolbarVisible ) {
		// Get available voices
		const voices = mw.wikispeech.browserTTS.getAvailableVoices();
		
		// 统一使用 getCurrentVoice 获取当前实际使用的语音
		const currentlyUsedVoice = mw.wikispeech.browserTTS.getCurrentVoice();
		
		// Create options for each voice
		const voiceOptions = [];
		
		// Separate Chinese voices and other voices for sorting
		const chineseVoices = [];
		const otherVoices = [];
		
		voices.forEach( voice => {
			const lang = voice.lang.toLowerCase();
			const displayName = self.getVoiceDisplayName( voice );
			
			const option = {
				data: voice.name + '|' + voice.lang, // 使用语音名称+语言代码作为唯一标识
				label: displayName,
				voice: voice
			};
			
			if ( lang.startsWith('zh') || lang.includes('chinese') ) {
				chineseVoices.push( option );
			} else {
				otherVoices.push( option );
			}
		});

		// Sort Chinese voices (Mandarin first, then Cantonese, then others)
		chineseVoices.sort( (a, b) => {
			const aName = a.label.toLowerCase();
			const bName = b.label.toLowerCase();
			
			// Prioritize Mandarin
			if ( aName.includes('mandarin') || aName.includes('普通话') ) return -1;
			if ( bName.includes('mandarin') || bName.includes('普通话') ) return 1;
			
			// Then Cantonese
			if ( aName.includes('cantonese') || aName.includes('粤语') || aName.includes('广东话') ) return -1;
			if ( bName.includes('cantonese') || bName.includes('粤语') || bName.includes('广东话') ) return 1;
			
			return a.label.localeCompare( b.label );
		});

		// Sort other voices alphabetically
		otherVoices.sort( (a, b) => a.label.localeCompare( b.label ) );

		// Combine: Chinese first, then others
		const allVoiceOptions = [...chineseVoices, ...otherVoices];

		// 保存当前实际使用的语音数据作为初始值（对话框显示的选中项）
		const initiallyDisplayedVoiceData = currentlyUsedVoice ? (currentlyUsedVoice.name + '|' + currentlyUsedVoice.lang) : null;

		// Create the dialog
		const languageSelectDialog = new OO.ui.MessageDialog({
			size: 'medium'
		});

		// Override the dialog's getBodyHeight to accommodate our content
		languageSelectDialog.getBodyHeight = function () {
			return 400; // 增加高度以容纳新的播放速度控件
		};

		// Add the dialog to window manager
		self.windowManager.addWindows( [ languageSelectDialog ] );

		// 创建对话框内容并保存对select元素的引用
		const dialogContent = self.createLanguageSettingsContent( allVoiceOptions, currentlyUsedVoice );
		const $dialogSelect = dialogContent.find( '.wikispeech-language-select' );
		const $speedSelect = dialogContent.find( '.wikispeech-speed-select' );

		// Open the dialog
		self.windowManager.openWindow( languageSelectDialog, {
			title: mw.msg( 'wikispeech-voice-settings' ),
			message: dialogContent,
			actions: [
				{
					action: 'save',
					label: mw.msg( 'saveprefs' ),
					flags: 'primary'
				},
				{
					action: 'cancel',
					label: mw.msg( 'wikispeech-cancel' ),
					flags: 'safe'
				}
			]
		}).closed.then( ( data ) => {
			// 恢复工具栏显示状态
			if ( wasToolbarVisible ) {
				self.toolbar.toggle( true );
			}

			if ( data && data.action === 'save' ) {
				// 处理语音变更
				const selectedVoiceDataFromDialog = $dialogSelect.val();
				
				// 重新获取当前实际使用的语音进行对比（确保使用最新状态）
				const currentlyUsedVoiceForComparison = mw.wikispeech.browserTTS.getCurrentVoice();
				const currentlyUsedVoiceData = currentlyUsedVoiceForComparison ? 
					(currentlyUsedVoiceForComparison.name + '|' + currentlyUsedVoiceForComparison.lang) : null;
				
				console.log( '[Wikispeech] Dialog selection:', selectedVoiceDataFromDialog );
				console.log( '[Wikispeech] Currently used voice:', currentlyUsedVoiceData );
				
				let hasChanges = false;
				let voiceName = '';
				
				// 处理语音变更
				if ( selectedVoiceDataFromDialog && selectedVoiceDataFromDialog !== currentlyUsedVoiceData ) {
					// 解析选中的语音数据
					const [selectedVoiceName, voiceLang] = selectedVoiceDataFromDialog.split('|');
					const selectedVoice = voices.find( v => v.name === selectedVoiceName && v.lang === voiceLang );
					
					if ( selectedVoice ) {
						console.log( '[Wikispeech] Setting new voice:', selectedVoice );
						mw.wikispeech.browserTTS.setVoice( selectedVoice );
						hasChanges = true;
						voiceName = selectedVoice.name;
						console.log( '[Wikispeech] Voice successfully changed to:', selectedVoice );
					}
				} else {
					voiceName = currentlyUsedVoiceForComparison?.name || '';
				}
				
				// 处理播放速度变更
				const selectedSpeed = parseFloat( $speedSelect.val() );
				const currentSpeed = parseFloat( mw.user.options.get( 'wikispeechSpeechRate' ) ) || 1.0;
				
				console.log( '[Wikispeech] Selected speed:', selectedSpeed, 'Current speed:', currentSpeed );
				
				if ( selectedSpeed !== currentSpeed ) {
					// 保存用户偏好设置
					new mw.Api().saveOption( 'wikispeechSpeechRate', selectedSpeed.toString() ).done( function() {
						// 更新本地用户选项缓存
						mw.user.options.set( 'wikispeechSpeechRate', selectedSpeed );
						console.log( '[Wikispeech] Speech rate preference saved and updated locally' );
						
						// 标记设置已更改
						if ( mw.wikispeech.browserTTS ) {
							mw.wikispeech.browserTTS.settingsChanged = true;
						}
					} );
					hasChanges = true;
					console.log( '[Wikispeech] Speech rate changed to:', selectedSpeed );
				}
				
				// 显示变更通知
				if ( hasChanges ) {
					const speedPercent = Math.round( selectedSpeed * 100 );
					mw.notify( mw.msg( 'wikispeech-settings-changed', voiceName, speedPercent + '%' ) );
				} else {
					console.log( '[Wikispeech] No changes made' );
				}
			}
		});
	};

	/**
	 * Create content for language settings dialog
	 */
	this.createLanguageSettingsContent = function ( voiceOptions, currentVoice ) {
		const $container = $( '<div>' ).addClass( 'wikispeech-settings-container' );
		
		// 语音选择部分
		const $voiceLabel = $( '<label>' )
			.text( mw.msg( 'wikispeech-voice' ) + ':' )
			.addClass( 'wikispeech-settings-label' );
		
		// 为这个对话框创建一个唯一的类名
		const uniqueClass = 'wikispeech-voice-select-' + Date.now();
		const $select = $( '<select>' )
			.addClass( 'wikispeech-language-select' )
			.addClass( uniqueClass ) // 添加唯一类名
			.css({
				width: '100%',
				padding: '8px',
				marginTop: '8px',
				fontSize: '14px',
				border: '1px solid #ccc',
				borderRadius: '4px',
				marginBottom: '20px'
			});

		// 使用传入的 currentVoice 参数创建对话框显示的当前选中项
		const currentVoiceData = currentVoice ? (currentVoice.name + '|' + currentVoice.lang) : null;
		console.log( '[Wikispeech] Creating dialog, will pre-select:', currentVoiceData );

		voiceOptions.forEach( option => {
			const $option = $( '<option>' )
				.val( option.data )
				.text( option.label );
			
			// 比较完整的语音标识
			if ( option.data === currentVoiceData ) {
				$option.prop( 'selected', true );
				console.log( '[Wikispeech] Pre-selected option in dialog:', option.data, option.label );
			}
			
			$select.append( $option );
		});

		// 播放速度选择部分
		const $speedLabel = $( '<label>' )
			.text( mw.msg( 'prefs-wikispeech-speech-rate' ) + ':' )
			.addClass( 'wikispeech-settings-label' );
		
		const $speedSelect = $( '<select>' )
			.addClass( 'wikispeech-speed-select' )
			.css({
				width: '100%',
				padding: '8px',
				marginTop: '8px',
				fontSize: '14px',
				border: '1px solid #ccc',
				borderRadius: '4px',
				marginBottom: '20px'
			});

		// 播放速度选项 - 统一为：50%, 75%, 100%, 125%, 150%, 200%
		const speedOptions = [
			{ value: 0.5, label: '50%' },
			{ value: 0.75, label: '75%' },
			{ value: 1.0, label: '100%' },
			{ value: 1.25, label: '125%' },
			{ value: 1.5, label: '150%' },
			{ value: 2.0, label: '200%' }
		];

		const currentSpeed = parseFloat( mw.user.options.get( 'wikispeechSpeechRate' ) ) || 1.0;
		console.log( '[Wikispeech] Current speech rate:', currentSpeed );

		speedOptions.forEach( option => {
			const $option = $( '<option>' )
				.val( option.value )
				.text( option.label );
			
			// 选择当前速度
			if ( Math.abs( option.value - currentSpeed ) < 0.01 ) { // 使用小的误差范围来比较浮点数
				$option.prop( 'selected', true );
				console.log( '[Wikispeech] Pre-selected speed:', option.label );
			}
			
			$speedSelect.append( $option );
		});

		const $description = $( '<p>' )
			.text( mw.msg( 'wikispeech-voice-settings-description' ) )
			.css({
				fontSize: '12px',
				color: '#666',
				marginTop: '12px',
				lineHeight: '1.4'
			});

		$container.append( $voiceLabel, $select, $speedLabel, $speedSelect, $description );
		
		return $container;
	};

	/**
	 * Get display name for a voice
	 */
	this.getVoiceDisplayName = function ( voice ) {
		// 简化显示名称，不特殊处理中文
		return `${voice.name} (${voice.lang})`;
	};
}

mw.wikispeech = mw.wikispeech || {};
mw.wikispeech.Ui = Ui;
mw.wikispeech.ui = new Ui();
