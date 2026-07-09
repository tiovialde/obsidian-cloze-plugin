import { App, Plugin, Menu, Editor, MarkdownView, Notice } from 'obsidian';
import lang from './lang';
import DEFAULT_SETTINGS, { ClozePluginSettings, HINT_STRATEGY } from './settings/settingData';
import SettingTab from './settings/settingTab';
import HintModal from './components/modal-hint';
import utils from './utils';
import { ATTRS, CLASSES } from './const';
import langs from './lang/en';
import errorCorrections from './error-corrections';

const ERROR_CORRECTION_ICON = 'spell-check-2';

export default class ClozePlugin extends Plugin {
	settings!: ClozePluginSettings;
	errorCorrectionRibbonEl: HTMLElement | null = null;

	isSourceHide = false;
	isPreviewHide = true;
	isPreviewErrorCorrectionMarkersVisible = false;

	constructor(app: App, manifest: any) {
		super(app, manifest);
	}

	async onload() {
		console.log('load cloze plugin');
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));
		this.initRibbon();
		this.initEditorMenu();
		this.initCommand();
		this.initMarkdownPostProcessor();
		this.initPageClickEvent();
		this.initNewWindowPageClickEvent();
	}

	private initRibbon() {
		this.addRibbonIcon('fish', lang.toggle_cloze, (evt: MouseEvent) => {
			if(this.checkTags()) {
				this.togglePageAllHide();
			}
		});
		this.errorCorrectionRibbonEl = this.addRibbonIcon(ERROR_CORRECTION_ICON, lang.toggle_error_correction_hints, (evt: MouseEvent) => {
			if(this.checkTags()) {
				this.togglePageAllErrorCorrectionMarkers();
			}
		});
		this.refreshErrorCorrectionRibbonTooltip();
	}

	private initEditorMenu() {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (
				menu: Menu,
				editor: Editor
			): void => {
				const selection = editor.getSelection();
				if (this.checkTags()) {
					if (selection) {
						menu.addItem((item) => {
							item
								.setTitle(lang.add_error_correction)
								.onClick((e) => {
									this.addErrorCorrection(editor);
								});
						});

						if(this.settings.editorMenuAddCloze) {
							menu.addItem((item) => {
								item
									.setTitle(lang.add_cloze)
									.onClick((e) => {
										this.addCloze(editor);
									});
							});
						}
						if (this.settings.editorMenuAddClozeWithHint) {
							menu.addItem((item) => {
								item
									.setTitle(lang.add_cloze_with_hint)
									.onClick((e) => {
										this.addCloze(editor, true);
									});
							});
						}
						if (this.settings.editorMenuRemoveCloze) {
							menu.addItem((item) => {
								item
									.setTitle(lang.remove_cloze)
									.onClick((e) => {
										this.removeCloze(editor);
									});
							});
						}

						if (this.settings.editorMenuRemoveErrorCorrection) {
							menu.addItem((item) => {
								item
									.setTitle(lang.remove_error_correction)
									.onClick((e) => {
										this.removeErrorCorrection(editor);
									});
							});
						}
					}
				}
			})
		);
	}

	private initCommand() {
		this.addCommand({
			id: "add-error-correction",
			name: lang.add_error_correction,
			icon: ERROR_CORRECTION_ICON,
			editorCallback: (editor, ctx) => {
				const selection = editor.getSelection();
				if (selection && this.checkTags()) {
					this.addErrorCorrection(editor);
				}
			}
		})

		this.addCommand({
			id: "add-cloze",
			name: lang.add_cloze,
			icon: "fish",
			editorCallback: (editor, ctx) => {
				const selection = editor.getSelection();
				if (selection && this.checkTags()) {
					this.addCloze(editor);
				}
			}
		})

		this.addCommand({
			id: "add-cloze-with-hint",
			name: lang.add_cloze_with_hint,
			icon: "fish-symbol",
			editorCallback: (editor, ctx) => {
				const selection = editor.getSelection();
				if (selection && this.checkTags()) {
					this.addCloze(editor, true);
				}
			}
		})

		this.addCommand({
			id: "remove-cloze",
			name: lang.remove_cloze,
			icon: "fish-off",
			editorCallback: (editor, ctx) => {
				const selection = editor.getSelection();
				if (selection && this.checkTags()) {
					this.removeCloze(editor);
				}
			},
		})

		this.addCommand({
			id: "toggle-cloze",
			name: lang.toggle_cloze,
			callback: () => {
				if(this.checkTags()) {
					this.togglePageAllHide();
				}
			},
		})

		this.addCommand({
			id: "toggle-error-correction-hints",
			name: lang.toggle_error_correction_hints,
			callback: () => {
				if(this.checkTags()) {
					this.togglePageAllErrorCorrectionMarkers();
				}
			},
		})
	}

	private initMarkdownPostProcessor() {
		this.registerMarkdownPostProcessor((element, context) => {
			if (!this.checkTags()) { return; }

			if (this.settings.fixedClozeWidth) {
				const containerEl = (context as any).containerEl as HTMLElement;
				if (containerEl) {
					containerEl.classList.add(CLASSES.fixedWidth);
				} else {
					new Notice('Cloze plugin: No containerEl.');
				}
			}
			
			// bracketed texts need to be surrounded with span
			if (this.settings.includeBracketed) {
				this.transformBracketedText(element);
			}

			errorCorrections.transformErrorCorrectionText(element, {
				open: this.settings.errorCorrectionOpen,
				delimiter: this.settings.errorCorrectionDelimiter,
				close: this.settings.errorCorrectionClose,
			});
			errorCorrections.setErrorCorrectionMarkersVisibility(element, this.isPreviewErrorCorrectionMarkersVisible);

			// curly bracketed text need to be surrounded with span
			if (this.settings.includeCurlyBrackets) {
				this.transformCurlyBracketedText(element);
			}

			element.querySelectorAll<HTMLElement>(this.clozeSelector())
				.forEach($cloze => {
					this.renderCloze($cloze);
					if(this.settings.hoverToReveal) {
						this.initClozeMouseOverReveal($cloze);
					}
				});
			
			this.toggleAllHide(element, this.isAllHide());
			this.refreshErrorCorrectionRibbonTooltip();
		})
	}

	private initClozeMouseOverReveal($cloze: HTMLElement) {
		this.registerDomEvent($cloze, 'mouseenter', (event) => {
			if (this.isPreviewMode()) {
				this.setClozeOnHover($cloze, true);
			}
		});
		this.registerDomEvent($cloze, 'mouseleave', (event) => {
			if (this.isPreviewMode()) {
				this.setClozeOnHover($cloze, false);
			}
		});
	}

	private initPageClickEvent() {
		this.registerDomEvent(document, 'click', (event) => {
			if (this.isPreviewMode()) {
				const correctionEl = utils.getErrorCorrectionEl(event.target as HTMLElement);
				if (correctionEl) {
					errorCorrections.toggleErrorCorrection(correctionEl);
					this.refreshErrorCorrectionRibbonTooltip();
					return;
				}
				this.toggleHide(utils.getClozeEl(event.target as HTMLElement));
			}
		});
		
		this.registerDomEvent(document, 'contextmenu', (event)=>{
			if (this.isPreviewMode()) { 
				const correctionEl = utils.getErrorCorrectionEl(event.target as HTMLElement);
				if (correctionEl) {
					this.onErrorCorrectionRightClick(event, correctionEl);
					return;
				}
				this.onRightClick(event, utils.getClozeEl(event.target as HTMLElement));
			}
		});
	}

	// init for new window
	private initNewWindowPageClickEvent() {
		const handler = (event: MouseEvent) => {
			const correctionEl = utils.getErrorCorrectionEl(event.target as HTMLElement);
			if (correctionEl) {
				errorCorrections.toggleErrorCorrection(correctionEl);
				this.refreshErrorCorrectionRibbonTooltip();
				return;
			}
			this.toggleHide(utils.getClozeEl(event.target as HTMLElement));
		}
		this.app.workspace.on('window-open', (a, win)=>{
			if(win !== null) {
				// remove it as event listener will be preserved in new window
				win.document.addEventListener("click", handler);
			}
		});
		this.app.workspace.on('window-close', (a, win)=>{
			if(win !== null) {
				// remove it as event listener will be preserved in new window
				win.document.removeEventListener("click", handler);
			}
		});
	}

	private onRightClick(event: MouseEvent, $cloze: HTMLElement | null) {
		if(!$cloze) return;
		if(!utils.isClozeHide($cloze)) return;
		if(utils.hasCustomHint($cloze)) return;
		const menu = new Menu();
		menu.addItem((item) =>
			item
			.setTitle(langs.reveal_more_hint)
			.setIcon("snail")
			.onClick(() => {
				this.revealMoreHint($cloze);
			})
		);
		menu.showAtMouseEvent(event);
	}

	private onErrorCorrectionRightClick(event: MouseEvent, correctionEl: HTMLElement) {
		const menu = new Menu();
		menu.addItem((item) =>
			item
			.setTitle(lang.toggle_error_correction_hints)
			.setIcon("snail")
			.onClick(() => {
				this.togglePageAllErrorCorrectionMarkers();
			})
		);
		menu.showAtMouseEvent(event);
	}

	private getErrorCorrectionCycleAction(nodeContainers: NodeListOf<HTMLElement>): 'mark' | 'resolve' | 'reset' {
		const unresolvedMarkedSelector = `.${CLASSES.errorCorrection}[${ATTRS.errorCorrectionResolved}="false"][${ATTRS.errorCorrectionMarkerVisible}="true"]`;
		const unresolvedHiddenSelector = `.${CLASSES.errorCorrection}[${ATTRS.errorCorrectionResolved}="false"][${ATTRS.errorCorrectionMarkerVisible}="false"]`;
		const resolvedSelector = `.${CLASSES.errorCorrection}[${ATTRS.errorCorrectionResolved}="true"]`;

		const hasUnresolvedMarked = Array.from(nodeContainers).some((nodeContainer) => !!nodeContainer.querySelector(unresolvedMarkedSelector));
		const hasUnresolvedHidden = Array.from(nodeContainers).some((nodeContainer) => !!nodeContainer.querySelector(unresolvedHiddenSelector));
		const hasResolved = Array.from(nodeContainers).some((nodeContainer) => !!nodeContainer.querySelector(resolvedSelector));

		if (hasUnresolvedMarked) {
			return 'resolve';
		}

		if (hasResolved && !hasUnresolvedHidden) {
			return 'reset';
		}

		return 'mark';
	}

	private refreshErrorCorrectionRibbonTooltip() {
		if (!this.errorCorrectionRibbonEl) return;

		const mostRecentLeaf = this.app.workspace.getMostRecentLeaf() as unknown as {containerEl: HTMLElement};
		if (!mostRecentLeaf?.containerEl) return;

		const nodeContainers = mostRecentLeaf.containerEl.querySelectorAll<HTMLElement>('.markdown-preview-view');
		const nextAction = this.getErrorCorrectionCycleAction(nodeContainers);

		let tooltip = lang.toggle_error_correction_hints_mark;
		if (nextAction === 'resolve') {
			tooltip = lang.toggle_error_correction_hints_resolve;
		} else if (nextAction === 'reset') {
			tooltip = lang.toggle_error_correction_hints_reset;
		}

		this.errorCorrectionRibbonEl.setAttribute('aria-label', tooltip);
		this.errorCorrectionRibbonEl.setAttribute('title', tooltip);
	}

	private togglePageAllErrorCorrectionMarkers() {
		if(!this.isPreviewMode()) return;

		const mostRecentLeaf = this.app.workspace.getMostRecentLeaf() as unknown as {containerEl: HTMLElement};
		if (!mostRecentLeaf) return;
		const leafContainer = mostRecentLeaf.containerEl as HTMLElement;
		if(!leafContainer) return;

		const nodeContainers = leafContainer.querySelectorAll<HTMLElement>('.markdown-preview-view');
		const nextAction = this.getErrorCorrectionCycleAction(nodeContainers);

		if (nextAction === 'resolve') {
			nodeContainers.forEach((nodeContainer) => {
				errorCorrections.resolveAllErrorCorrections(nodeContainer);
				errorCorrections.setErrorCorrectionMarkersVisibility(nodeContainer, false);
			});
			this.isPreviewErrorCorrectionMarkersVisible = false;
			this.refreshErrorCorrectionRibbonTooltip();
			return;
		}

		if (nextAction === 'reset') {
			nodeContainers.forEach((nodeContainer) => {
				errorCorrections.resetErrorCorrections(nodeContainer);
				errorCorrections.setErrorCorrectionMarkersVisibility(nodeContainer, false);
			});
			this.isPreviewErrorCorrectionMarkersVisible = false;
			this.refreshErrorCorrectionRibbonTooltip();
			return;
		}

		nodeContainers.forEach((nodeContainer) => {
			errorCorrections.setErrorCorrectionMarkersVisibility(nodeContainer, true);
		})
		this.isPreviewErrorCorrectionMarkersVisible = true;
		this.refreshErrorCorrectionRibbonTooltip();
	}

	private isPreviewMode(): boolean {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view == null) return true; // Under canvas mode
		return view.getMode() === 'preview';
	}

	private isAllHide(): boolean {
		return this.isPreviewMode() ? this.isPreviewHide : this.isSourceHide;
	}

	// Extract and verify tags - works in both preview and edit mode
	private checkTags(): boolean {
		if (this.settings.selectorTag === '' || this.settings.selectorTag === "#") { // Skip of this feature is not used
			return true;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const { app, file } = activeView;
			if (file) {
				const cachedMetadata = app.metadataCache.getFileCache(file);
				const tags = (cachedMetadata?.tags || []).map(t => t.tag);
				const frontmatterTags = cachedMetadata?.frontmatter?.tags || [];
				return [...frontmatterTags, ...tags].some((t:string) => {
					if(!t.startsWith('#')) {
						t = '#' + t;
					}
					return t.toLowerCase() === this.settings.selectorTag.toLowerCase();
				});
			}
		}
		return false;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.isPreviewHide = this.settings.defaultHide;
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.isPreviewHide = this.settings.defaultHide;
	}

	clozeSelector = () => {
		const selectors = ['.cloze-span'];
		if (this.settings.includeHighlighted) {
			selectors.push('mark');
			selectors.push('.cm-highlight');
		}
		if (this.settings.includeUnderlined) {
			selectors.push('u');
		}
		if (this.settings.includeBolded) {
			selectors.push('strong');
			selectors.push('.cm-strong');
		}
		if (this.settings.includeItalics) {
			selectors.push('em');
			selectors.push('.cm-em');
		}
		return selectors.join(', ');
	}

	transformBracketedText = (element: HTMLElement) => {
		const items = element.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, h5, li, td, th, code");
		items.forEach((item: HTMLElement) => {
			item.innerHTML = item.innerHTML.replace(/\[(.*?)\]/g, '<span class="cloze-span">$1</span>');
		})
	}

	transformCurlyBracketedText = (element: HTMLElement) => {
		const items = element.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, h5, li, td, th, code");
		items.forEach((item: HTMLElement) => {
			item.innerHTML = item.innerHTML.replace(/\{([^{}\/]*)\}/g, '<span class="cloze-span">$1</span>');
		})
	}
	
	renderCloze = ($cloze: HTMLElement) => {
		$cloze.classList.add(CLASSES.cloze);
		$cloze.innerHTML = `<span class="cloze-hint"></span>`
		+ `<span class="cloze-content">${$cloze.innerHTML}</span>`;
		
		this.initHint($cloze);
	}

	initHint = ($cloze: HTMLElement) => {
		let hint = "";
		if(utils.hasCustomHint($cloze)) { 							// if we have attribute: data-cloze-hint then
			hint = utils.getClozeCustomHint($cloze); 				// use it                 
		} else {
			const textContent = utils.getClozeContent($cloze);
			if(this.settings.hintStrategy === HINT_STRATEGY.count) {
				hint = textContent.slice(0, this.settings.hintCount);
			} else if(this.settings.hintStrategy === HINT_STRATEGY.percentage) {
				hint = textContent.slice(0, Math.ceil(textContent.length * this.settings.hintPercentage));
			}
		}
		utils.setClozeHint($cloze, hint);
	}

	// ----------- cloze interaction ------------

	hideClozeContent = (target: HTMLElement | null) => {
		if(!target) return;
		if(!target.getAttribute(ATTRS.hide)) {                         
			target.setAttribute(ATTRS.hide, 'true');     // add attribute: data-cloze-hide: true
		}
		this.updateClozeClass(target);                 			// update class
		this.initHint(target);                 			// reinit hint
	}

	showClozeContent = (target: HTMLElement | null) => {
		if(!target) return;
		if(target.getAttribute(ATTRS.hide)) {      					  
			target.removeAttribute(ATTRS.hide);        					  // remove attribute: data-cloze-hide:true
		}
		this.updateClozeClass(target);
	}

	setClozeOnHover = (target: HTMLElement | null, hoverState: boolean) => {
		if(!target) return;
		if(hoverState) {
			target.setAttribute(ATTRS.hover, 'true');
		} else {
			target.removeAttribute(ATTRS.hover);
		}
		this.updateClozeClass(target);
	}

	updateClozeClass = (target: HTMLElement) => {
		if(target.getAttribute(ATTRS.hover) || !target.getAttribute(ATTRS.hide)) {
			target.classList.remove(CLASSES.colzeHide);
		} else {
			target.classList.add(CLASSES.colzeHide);
		}
	}

	toggleHide(target: HTMLElement | null) {
		if(!target) return;
		if (target.getAttribute(ATTRS.hide)) {
			this.showClozeContent(target);
		} else {
			this.hideClozeContent(target);
		}
	}

	toggleAllHide(dom: HTMLElement | Document | null = document, hide: boolean) {
		if (dom && this.checkTags()) {
			const marks = dom.querySelectorAll<HTMLElement>(this.clozeSelector());
			if (hide) {
				marks.forEach((mark) => {
					this.hideClozeContent(mark);
				})
			} else {
				marks.forEach((mark) => {
					this.showClozeContent(mark);
				})
			}
		}
	}

	togglePageAllHide() {
		const mostRecentLeaf = this.app.workspace.getMostRecentLeaf() as unknown as {containerEl: HTMLElement};
		if (!mostRecentLeaf) return;
		const leafContainer = mostRecentLeaf.containerEl as HTMLElement;
		if(!leafContainer) return;
		if(this.isPreviewMode()) {
			const nodeContainers = leafContainer.querySelectorAll<HTMLElement>('.markdown-preview-view');
			nodeContainers.forEach((nodeContainer) => {
				this.toggleAllHide(nodeContainer, !this.isPreviewHide);
			})
			this.isPreviewHide = !this.isPreviewHide;
		} else {
			const nodeContainers = leafContainer.querySelectorAll<HTMLElement>('.markdown-source-view');
			nodeContainers.forEach((nodeContainer) => {
				this.toggleAllHide(nodeContainer, !this.isSourceHide);
			})
			this.isSourceHide = !this.isSourceHide;
		}
	}

	addCloze = (editor: Editor, needHint?: boolean) => {
		const currentStr = editor.getSelection();
		const content = currentStr
			.replace(/<span class="cloze-span">(.*?)<\/span>/g, "$1");
		if (needHint) {
			new HintModal(this.app, content, (hint) => {
				const newStr = `<span class="cloze-span" data-cloze-hint="${hint}">` + content + '</span>';
				editor.replaceSelection(newStr);
				editor.blur();
			}).open();
		} else {
			const newStr = '<span class="cloze-span">' + content + '</span>';
			editor.replaceSelection(newStr);
			editor.blur();
		}
	}

	addErrorCorrection = (editor: Editor) => {
		const currentStr = editor.getSelection();
		if (!currentStr) return;

		const selectionStart = editor.getCursor("from");
		const open = this.settings.errorCorrectionOpen;
		const delimiter = this.settings.errorCorrectionDelimiter;
		const close = this.settings.errorCorrectionClose;
		if (!open || !delimiter || !close) return;

		const newStr = `${open}${delimiter}${currentStr}${close}`;
		editor.replaceSelection(newStr);
		editor.setCursor({
			line: selectionStart.line,
			ch: selectionStart.ch + open.length,
		});
		editor.focus();
	}

	private escapeRegex(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	private findEnclosingErrorCorrection(lineText: string, cursorCh: number, open: string, delimiter: string, close: string) {
		const pattern = `${this.escapeRegex(open)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(delimiter)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(close)}`;
		const regex = new RegExp(pattern, 'g');
		let match: RegExpExecArray | null;

		while ((match = regex.exec(lineText)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			if (cursorCh >= start && cursorCh <= end) {
				return {
					start,
					end,
					correct: match[2].trim(),
				};
			}

			// Avoid potential infinite loops on zero-length matches.
			if (regex.lastIndex === match.index) {
				regex.lastIndex += 1;
			}
		}

		return null;
	}

	private findOverlappingErrorCorrection(lineText: string, rangeStart: number, rangeEnd: number, open: string, delimiter: string, close: string) {
		const pattern = `${this.escapeRegex(open)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(delimiter)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(close)}`;
		const regex = new RegExp(pattern, 'g');
		let match: RegExpExecArray | null;

		while ((match = regex.exec(lineText)) !== null) {
			const start = match.index;
			const end = start + match[0].length;
			const overlaps = rangeStart <= end && rangeEnd >= start;
			if (overlaps) {
				return {
					start,
					end,
					correct: match[2].trim(),
				};
			}

			if (regex.lastIndex === match.index) {
				regex.lastIndex += 1;
			}
		}

		return null;
	}

	private getClozeRemovalPatterns() {
		const patterns = [
			/<span[^>]*class=["'][^"']*cloze-span[^"']*["'][^>]*>([\s\S]*?)<\/span>/g,
		];

		if (this.settings.includeHighlighted) {
			patterns.push(/==([\s\S]*?)==/g);
		}
		if (this.settings.includeUnderlined) {
			patterns.push(/<u>([\s\S]*?)<\/u>/g);
		}
		if (this.settings.includeBolded) {
			patterns.push(/\*\*([\s\S]*?)\*\*/g);
		}
		if (this.settings.includeItalics) {
			patterns.push(/\*([^*\n]+?)\*/g);
		}
		if (this.settings.includeBracketed) {
			patterns.push(/\[([^\]\n]*?)\]/g);
		}
		if (this.settings.includeCurlyBrackets) {
			patterns.push(/\{([^{}\n]*?)\}/g);
		}

		return patterns;
	}

	private removeClozeSyntax(value: string): string {
		let result = value;
		this.getClozeRemovalPatterns().forEach((pattern) => {
			result = result.replace(pattern, '$1');
		});
		return result;
	}

	private findOverlappingCloze(lineText: string, rangeStart: number, rangeEnd: number) {
		for (const pattern of this.getClozeRemovalPatterns()) {
			pattern.lastIndex = 0;
			let match: RegExpExecArray | null;

			while ((match = pattern.exec(lineText)) !== null) {
				const start = match.index;
				const end = start + match[0].length;
				const overlaps = rangeStart <= end && rangeEnd >= start;
				if (overlaps) {
					return {
						start,
						end,
						content: match[1],
					};
				}

				if (pattern.lastIndex === match.index) {
					pattern.lastIndex += 1;
				}
			}
		}

		return null;
	}

	private findEnclosingCloze(lineText: string, cursorCh: number) {
		return this.findOverlappingCloze(lineText, cursorCh, cursorCh);
	}

	removeErrorCorrection = (editor: Editor) => {
		const currentStr = editor.getSelection();
		const open = this.settings.errorCorrectionOpen;
		const delimiter = this.settings.errorCorrectionDelimiter;
		const close = this.settings.errorCorrectionClose;
		if (!open || !delimiter || !close) return;

		if (currentStr) {
			const from = editor.getCursor('from');
			const to = editor.getCursor('to');
			const pattern = `${this.escapeRegex(open)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(delimiter)}\\s*([\\s\\S]*?)\\s*${this.escapeRegex(close)}`;
			const regex = new RegExp(pattern, 'g');
			const newStr = currentStr.replace(regex, (_, wrong: string, correct: string) => {
				void wrong;
				return correct.trim();
			});
			if (newStr !== currentStr) {
				editor.replaceSelection(newStr);
				editor.focus();
				return;
			}

			if (from.line === to.line) {
				const lineText = editor.getLine(from.line);
				const target = this.findOverlappingErrorCorrection(lineText, from.ch, to.ch, open, delimiter, close);
				if (target) {
					editor.replaceRange(
						target.correct,
						{ line: from.line, ch: target.start },
						{ line: from.line, ch: target.end }
					);
					editor.setCursor({ line: from.line, ch: target.start + target.correct.length });
					editor.focus();
				}
			}

			return;
		}

		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);
		const target = this.findEnclosingErrorCorrection(lineText, cursor.ch, open, delimiter, close);
		if (!target) return;

		editor.replaceRange(
			target.correct,
			{ line: cursor.line, ch: target.start },
			{ line: cursor.line, ch: target.end }
		);
		editor.setCursor({ line: cursor.line, ch: target.start + target.correct.length });
		editor.focus();
	}

	removeCloze = (editor: Editor) => {
		const currentStr = editor.getSelection();
		if (currentStr) {
			const from = editor.getCursor('from');
			const to = editor.getCursor('to');
			const newStr = this.removeClozeSyntax(currentStr);
			if (newStr !== currentStr) {
				editor.replaceSelection(newStr);
				editor.focus();
				return;
			}

			if (from.line === to.line) {
				const lineText = editor.getLine(from.line);
				const target = this.findOverlappingCloze(lineText, from.ch, to.ch);
				if (target) {
					editor.replaceRange(
						target.content,
						{ line: from.line, ch: target.start },
						{ line: from.line, ch: target.end }
					);
					editor.setCursor({ line: from.line, ch: target.start + target.content.length });
					editor.focus();
				}
			}

			return;
		}

		const cursor = editor.getCursor();
		const lineText = editor.getLine(cursor.line);
		const target = this.findEnclosingCloze(lineText, cursor.ch);
		if (!target) return;

		editor.replaceRange(
			target.content,
			{ line: cursor.line, ch: target.start },
			{ line: cursor.line, ch: target.end }
		);
		editor.setCursor({ line: cursor.line, ch: target.start + target.content.length });
		editor.focus();
	};

	revealMoreHint = ($cloze: HTMLElement) => {
		const currentHint = utils.getClozeCurrentHint($cloze);
		const hintLength = currentHint.length + 3;
		utils.setClozeHint($cloze, utils.getClozeContent($cloze).slice(0, hintLength));
	}
}

