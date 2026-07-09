import { ATTRS, CLASSES } from './const';

export interface ErrorCorrectionSyntax {
	open: string;
	delimiter: string;
	close: string;
}

export const DEFAULT_ERROR_CORRECTION_SYNTAX: ErrorCorrectionSyntax = {
	open: '{',
	delimiter: '/',
	close: '}',
};

function escapeRegex(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildErrorCorrectionRegex(syntax: ErrorCorrectionSyntax): RegExp | null {
	const open = syntax.open;
	const delimiter = syntax.delimiter;
	const close = syntax.close;
	if (!open || !delimiter || !close) {
		return null;
	}

	return new RegExp(`${escapeRegex(open)}\\s*([\\s\\S]*?)\\s*${escapeRegex(delimiter)}\\s*([\\s\\S]*?)\\s*${escapeRegex(close)}`, 'g');
}

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderCollapsedHtml(wrongText: string): string {
	return `<span class="${CLASSES.errorCorrection}" ${ATTRS.errorCorrectionWrong}="${escapeHtml(wrongText)}" ${ATTRS.errorCorrectionResolved}="false">${escapeHtml(wrongText)}</span>`;
}

function renderExpandedHtml(wrongText: string, correctText: string, syntax: ErrorCorrectionSyntax): string {
	void syntax;
	return `<del class="${CLASSES.errorCorrectionWrong}">${escapeHtml(wrongText)}</del> `
		+ `<mark class="${CLASSES.errorCorrectionCorrect}">${escapeHtml(correctText)}</mark>`;
}

function renderCollapsedElementHtml(wrongText: string, correctText: string): string {
	return `<span class="${CLASSES.errorCorrection}" ${ATTRS.errorCorrectionWrong}="${escapeHtml(wrongText)}" ${ATTRS.errorCorrectionCorrect}="${escapeHtml(correctText)}" ${ATTRS.errorCorrectionResolved}="false" ${ATTRS.errorCorrectionMarkerVisible}="false">${escapeHtml(wrongText)}</span>`;
}

export function transformErrorCorrectionText(element: HTMLElement, syntax: ErrorCorrectionSyntax = DEFAULT_ERROR_CORRECTION_SYNTAX): void {
	const regex = buildErrorCorrectionRegex(syntax);
	if (!regex) {
		return;
	}

	const items = element.querySelectorAll('p, h1, h2, h3, h4, h5, li, td, th, code');
	items.forEach((item) => {
		const htmlItem = item as HTMLElement;
		htmlItem.innerHTML = htmlItem.innerHTML.replace(regex, (_, wrongText: string, correctText: string) => {
			const wrong = wrongText.trim();
			const correct = correctText.trim();
			if (!wrong || !correct) {
				return _;
			}
			return renderCollapsedElementHtml(wrong, correct);
		});
	});
}

export function toggleErrorCorrection(target: HTMLElement, syntax: ErrorCorrectionSyntax = DEFAULT_ERROR_CORRECTION_SYNTAX): void {
	const wrong = target.getAttribute(ATTRS.errorCorrectionWrong) || '';
	const correct = target.getAttribute(ATTRS.errorCorrectionCorrect) || '';
	if (!wrong || !correct) {
		return;
	}

	const resolved = target.getAttribute(ATTRS.errorCorrectionResolved) === 'true';
	if (resolved) {
		target.textContent = wrong;
		target.setAttribute(ATTRS.errorCorrectionResolved, 'false');
		target.setAttribute(ATTRS.errorCorrectionMarkerVisible, 'false');
		return;
	}

	target.innerHTML = renderExpandedHtml(wrong, correct, syntax);
	target.setAttribute(ATTRS.errorCorrectionResolved, 'true');
	target.setAttribute(ATTRS.errorCorrectionMarkerVisible, 'false');
}

export function setErrorCorrectionMarkersVisibility(dom: ParentNode, visible: boolean): void {
	const value = visible ? 'true' : 'false';
	dom.querySelectorAll<HTMLElement>(`.${CLASSES.errorCorrection}`).forEach((item) => {
		if (isErrorCorrectionResolved(item)) {
			item.setAttribute(ATTRS.errorCorrectionMarkerVisible, 'false');
			return;
		}
		item.setAttribute(ATTRS.errorCorrectionMarkerVisible, value);
	});
}

export function resetErrorCorrections(dom: ParentNode): void {
	dom.querySelectorAll<HTMLElement>(`.${CLASSES.errorCorrection}`).forEach((item) => {
		if (!isErrorCorrectionResolved(item)) {
			return;
		}
		const wrong = item.getAttribute(ATTRS.errorCorrectionWrong) || '';
		if (!wrong) {
			return;
		}
		item.textContent = wrong;
		item.setAttribute(ATTRS.errorCorrectionResolved, 'false');
		item.setAttribute(ATTRS.errorCorrectionMarkerVisible, 'false');
	});
}

export function resolveAllErrorCorrections(dom: ParentNode): void {
	dom.querySelectorAll<HTMLElement>(`.${CLASSES.errorCorrection}`).forEach((item) => {
		if (isErrorCorrectionResolved(item)) {
			return;
		}
		toggleErrorCorrection(item);
	});
}

export function isErrorCorrectionMarkerVisible(target: HTMLElement): boolean {
	return target.getAttribute(ATTRS.errorCorrectionMarkerVisible) === 'true';
}

export function isErrorCorrectionResolved(target: HTMLElement): boolean {
	return target.getAttribute(ATTRS.errorCorrectionResolved) === 'true';
}

export default {
	DEFAULT_ERROR_CORRECTION_SYNTAX,
	transformErrorCorrectionText,
	toggleErrorCorrection,
	setErrorCorrectionMarkersVisibility,
	resetErrorCorrections,
	resolveAllErrorCorrections,
	isErrorCorrectionMarkerVisible,
	isErrorCorrectionResolved,
};
