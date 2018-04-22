const {URL, domainToUnicode} = require('url');

function handleURL(url, withPath) {
	url = String(url);

	try {
		url = new URL(url);
	} catch (err) {
		return url;
	}

	const domain = url.hostname.split('.');

	if (domain[0] === 'www' && domain.length >= 3) {
		domain.shift();
	}

	url.hostname = domainToUnicode(domain.join('.'));

	if (withPath) {
		return url.host + url.pathname.replace(/\/$/, '');
	}

	return url.host;
}

/**
 * Return the domain of an URL, also converts punnycode domains correctly
 * @param {string} url The URL to humanize
 * @returns {string} The humanized URL
 * @example
 * domain('https://www.google.com/page/'); // -> 'google.com'
 */
function domain(url) {
	return handleURL(url, false);
}

/**
 * Return the domain of an URL with the path, also converts punnycode domains correctly
 * @param {string} url The URL to humanize
 * @returns {string} The humanized URL
 * @example
 * domain('https://www.google.com/page/'); // -> 'google.com/page'
 */
function domainWithPath(url) {
	return handleURL(url, true);
}

module.exports = {
	domain,
	domainWithPath
};
