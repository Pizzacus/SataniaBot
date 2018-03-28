const {URL} = require('url');
const fetch = require('make-fetch-happen').defaults(
	requireUtil('fetch-defaults')
);
const cheerio = require('cheerio');
const fileType = require('file-type');

const {isSVG} = requireUtil('svg-utils');
const formats = requireUtil('get-supported-formats')();

const defaultOptions = {
	fetchOptions: {},
	imageMime: formats,
	maxFetch: 4,
	targetQueries: [
		'meta[name="sataniabot_image" i]',
		'meta[property="sataniabot_image" i]',
		'meta[name="twitter:image" i]',
		'meta[property="og:image:secure_url" i]',
		'meta[property="og:image:url" i]',
		'meta[property="og:image" i]',
		'meta[property="twitter:image" i]',
		'meta[name="og:image:secure_url" i]',
		'meta[name="og:image:url" i]',
		'meta[name="og:image" i]',
		'link[rel="image_src" i]',
		'body > img:only-child',
		'.ProfileAvatar-container', // Twitter PFPs
		'.postContainer.opContainer .fileThumb' // 4chan threads
	],
	targetAttributes: ['content', 'href', 'src'],
	expectImage: false
};

class FetchImageError extends Error {
	constructor(message, type) {
		super(message);

		this.message = message;
		this.type = type;
	}
}

/**
 * The options to fetch an image
 * @typedef {Object} Options
 * @property {object} [fetchOptions] The options to pass to node-fetch
 * @property {string[]} [imageMime] The mime types to recognize as images
 * @property {number} [maxFetch=4] The maximal number of requests to do
 * @property {string[]} [targetQueries] The queries in CSS Selectors to match elements which are images, ordered by priority
 * @property {string[]} [targetAttributes] The attributes to look for image URLs in, ordered by priority
 * @property {boolean} [expectImage=false] If the function should throw if HTML is fetched and not an image
 */

/**
 * Fetch an image from a URL,
 * parse the page if it gets HTML to attempt extracting an image from it
 * @param {...string} url The URLs to fetch an image from, first URL which is successfully fetched is returned
 * @param {Options} [options] The options for the request
 * @returns {Promise<Buffer>}
 * @throws If no image are found or if the request is unsuccessful, if multiple images are passed, the first error is returned
 */
async function fetchImage(...urls) {
	let options;

	// Take the last argument which MAY be the options
	const customOptions = urls.pop();

	if (typeof customOptions === 'object') {
		// Check if the options were previously already assigned
		// to only do it once, because we rely on fetchImage to only call
		// itself recursively with the same option object
		if (customOptions.__assigned__) {
			options = customOptions;
		} else {
			options = {
				...defaultOptions,
				...customOptions,

				// Mark the options as assigned
				__assigned__: true
			};
		}
	} else {
		// Since the last argument wasn't the options, we can put it back
		urls.push(customOptions);
		options = {...defaultOptions};
	}

	if (!urls.every(elem => typeof elem === 'string')) {
		throw new TypeError('All URLs must be strings');
	}

	return actuallyFetchImages(urls, options);
}

/**
 * Actually fetch the images recursively, this function is called by fetchImage,
 * fetchimage only revolves options and performs certain checks,
 * this one actually fetches the images
 * @param {string[]} urls
 * @param {Options} options
 */
async function actuallyFetchImages(urls, options) {
	let firstError;

	for (const url of urls) {
		if (options.maxFetch <= 0) {
			break;
		}

		try {
			const image = await fetchSingleImage(url, options);

			if (image) {
				return image;
			}
		} catch (err) {
			if (!firstError) {
				firstError = err;
			}
		}
	}

	throw firstError ||
		new FetchImageError('No images were found on that page', 'no-images');
}

/**
 * Fetch an image from a single URL.
 * Is internally called by actuallyFetchImage()
 * @param {string} url The URL to fetch an image from
 * @param {Options} [options] The options for the request
 * @returns {buffer} The image fetched
 * @throws If no image are found or if the request is unsuccessful
 */
async function fetchSingleImage(url, options) {
	if (typeof options.maxFetch === 'number') {
		options.maxFetch--;
	}

	const accepts = requireUtil('get-supported-formats')();
	accepts.push('image/*;q=0.8', 'text/html;q=0.5', '*/*;q=0.1');

	const res = await fetch(url, {
		...options.fetchOptions,
		headers: {
			...options.fetchOptions.headers,
			Accept: accepts.join(', ')
		}
	});

	if (!res.status >= 200 && res.status < 400) {
		const err = new FetchImageError(
			'The server returned an Error ' + res.status,
			'not-ok'
		);
		err.status = res.status;

		throw err;
	}

	const body = await res.buffer();
	let type = fileType(body);

	if (type) {
		type = type.mime;
	} else if (isSVG(body)) {
		type = 'image/svg+xml';
	}

	if (options.imageMime.includes(type)) {
		return body;
	}

	if (options.expectImage) {
		throw new FetchImageError(
			'An image was expected, but another type was returned',
			'image-expected'
		);
	}

	const links = [...findImages(body, url, options)];
	return fetchImage(...links, options);
}

/**
 * Attempts to find the image URLs from an HTML buffer
 * @param {buffer} body The HTML buffer to find images in
 * @param {string} url The URL to use as base for relative links
 * @param {Options} options
 * @yields {string} The URLs found
 */
function * findImages(body, baseUrl, options) {
	let $;

	try {
		$ = cheerio.load(body);
	} catch (err) {
		return;
	}

	for (const query of options.targetQueries) {
		const elements = $(query).get();

		for (const elem of elements) {
			const attr = options.targetAttributes.find(attr => attr in elem.attribs);

			if (attr) {
				let url;

				try {
					url = new URL(elem.attribs[attr], baseUrl);
					yield url.href;
				} catch (err) {}
			}
		}
	}
}

fetchImage.FetchImageError = FetchImageError;
fetchImage.defaults = defaultOptions;

module.exports = fetchImage;
