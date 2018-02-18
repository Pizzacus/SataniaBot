const path = require('path');
const {format: formats} = require('sharp');

const pkg = require(path.resolve('package.json'));
const config = requireUtil('config');

const options = {
	retry: config.download.retry || 5,
	timeout: config.download.timeout || 10000,
	size: config.download.maxSize || 10 * 1024 * 1024,
	headers: {
		'User-Agent': `${pkg.name}/${pkg.version} (+${pkg.homepage})`
	}
};

if (config.download.cache) {
	options.cacheManager = path.resolve('data/cache');
}

const formatMimes = {
	webp: 'image/webp',
	jpeg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	gif: 'image/gif',
	tiff: 'image/tiff'
};

const accepts = [];

for (const key of Object.keys(formats)) {
	const format = formats[key];
	if (format.input.buffer && format.id in formatMimes) {
		accepts.push(formatMimes[format.id]);
	}
}

accepts.push(
	'image/*;q=0.8',
	'text/html;q=0.5',
	'*/*;q=0.1'
);

options.headers.Accept = accepts.join(', ');

module.exports = options;
