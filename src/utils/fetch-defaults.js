const path = require('path');

const pkg = require(path.resolve('package.json'));
const config = requireUtil('config');

const homepage = pkg.repository || pkg.homepage;

const options = {
	retry: config.download.retry || 5,
	timeout: config.download.timeout || 10000,
	size: config.download.maxSize || 10 * 1024 * 1024,
	headers: {
		'User-Agent': `${pkg.name}/${pkg.version} (+${homepage})`
	},
	strictSSL: true
};

if (config.download.cache) {
	options.cacheManager = path.resolve('data/cache');
}

module.exports = options;
