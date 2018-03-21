const {format: formats} = require('sharp');

const formatMimes = {
	webp: 'image/webp',
	jpeg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	gif: 'image/gif',
	tiff: 'image/tiff',
	pdf: 'application/pdf'
};

function getSupportedFormats() {
	const supported = [];

	for (const key of Object.keys(formats)) {
		const format = formats[key];
		if (format.input.buffer && format.id in formatMimes) {
			supported.push(formatMimes[format.id]);
		}
	}

	return supported;
}

module.exports = getSupportedFormats;
