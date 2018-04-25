/**
 * Various utils for working with SVG files
 * @module svg-utils
 * @example
 * const svgUtils = requireUtil('svg-utils')
 */

const cheerio = require('cheerio');

/**
 * Check if a string or buffer is a valid SVG file
 * @param {Buffer|string} content The string to check
 * @returns {boolean} A boolean which is true if the content is indeed an SVG image
 */
function isSVG(content) {
	let svg;

	try {
		svg = cheerio.load(content, {
			xmlMode: true
		});
	} catch (err) {
		return;
	}

	return svg(':root').is('svg');
}

/**
 * Parses an SVG and returns the size in pixel
 *
 * If the content is not an SVG, it will return `undefined`
 *
 * @param {string|Buffer} content The content to parse the size from
 * @returns {?Object} The size of the SVG
 */
function getSVGSize(content) {
	let svg;

	try {
		svg = cheerio.load(content, {
			xmlMode: true
		});
	} catch (err) {
		return;
	}

	const root = svg(':root');

	if (!root.is('svg')) {
		return;
	}

	let width = parseInt(root.attr('width'), 10);
	let height = parseInt(root.attr('height'), 10);
	const [, , viewWidth, viewHeight] = (root.attr('viewBox') || '')
		.split(/[,\s]+/)
		.map(int => parseInt(int, 10));

	if (!viewHeight || !viewWidth) {
		return;
	}

	const ratio = viewWidth / viewHeight;

	if (isNaN(width) && isNaN(height)) {
		width = viewWidth;
		height = viewHeight;
	} else if (isNaN(height)) {
		height = Math.floor(width / ratio);
	} else if (isNaN(height)) {
		width = Math.floor(height * ratio);
	}

	return {
		width,
		height
	};
}

/**
 * Determines the best density value for an SVG file for it to be rendered at full resolution
 *
 * The results of this function can be passed to sharp directly
 *
 * @param {Buffer|string} svg The SVG image to use
 * @param {number} width The target Width the SVG image will be rendered in
 * @param {number} height The target Height the SVG image will be rendered in
 * @param {number} [baseDensity=72] The base dnesity to use, defaults to 72 which is usually the correct value
 * @returns {?number} The optimal density or undefined if non-applicable
 */
function optimalDensity(svg, width, height, baseDensity = 72) {
	const size = getSVGSize(svg);

	if (!size) {
		return;
	}

	const svgHeight = size.height;
	const svgWidth = size.width;

	if (!svgWidth || !svgHeight) {
		return;
	}

	let optimalWidth;
	let optimalHeight;

	if (width) {
		optimalWidth = width / svgWidth * baseDensity;
	}

	if (height) {
		optimalHeight = height / svgHeight * baseDensity;
	}

	const optimalSize = Math.max(optimalWidth, optimalHeight);

	if (!optimalSize) {
		return;
	}

	return Math.max(optimalSize, baseDensity);
}

module.exports = {
	isSVG,
	getSVGSize,
	optimalDensity
};
