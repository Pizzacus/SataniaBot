const {URL} = require('url');
const fetch = require('make-fetch-happen').defaults(
	requireUtil('fetch-defaults')
);
const cheerio = require('cheerio');
const fileType = require('file-type');
const tough = require('tough-cookie');

const {isSVG} = requireUtil('svg-utils');
const formats = requireUtil('get-supported-formats')();

function meta(name) {
	return `meta[name="${name}" i], meta[property="${name}"]`;
}

const defaultOptions = {
	fetchOptions: {},
	imageMime: formats,
	maxFetch: 4,
	targetQueries: [
		// --- Website Overrides ---
		// For websites that do provide valid image metadata
		// ...but we still want to use something else
		'.cool-work .cool-work-main .img-container img', // Pixiv SFW
		'.cool-work .cool-work-main .sensored img', // Pixiv NSFW... Yes they really spelt it that way

		// --- General Rules ---
		// https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/summary-card-with-large-image
		meta('twitter:image'),

		// https://ogp.me/
		meta('og:image:secure_url'),
		meta('og:image:url'),
		meta('og:image'),

		// http://open.weibo.com/wiki/Weibo_meta_tag
		meta('weibo:image:full_image'),
		meta('weibo:image:image'),
		meta('weibo:webpage:image'),
		meta('weibo:article:image'),
		meta('weibo:audio:image'),
		meta('weibo:video:image'),
		meta('weibo:person:image'),
		meta('weibo:product:full_image'),
		meta('weibo:product:image'),
		meta('weibo:game:full_image'),
		meta('weibo:game:image'),

		// https://support.google.com/customsearch/answer/1626955?hl=en
		meta('thumbnail'),

		// https://stackoverflow.com/questions/19274463/what-is-link-rel-image-src
		'link[rel="image_src" i]',

		// https://getstarted.sailthru.com/site/personalization-engine/meta-tags/
		meta('sailthru.image.full'),
		meta('sailthru.image.thumb'),
		meta('sailthru.image'),

		// Websites with nothing but an image
		'body > img:only-child',

		// --- Site-specific properties ---
		'.ProfileAvatar-container', // Twitter PFPs
		'#comic > img', // XKCD
		'.postContainer.opContainer .fileThumb' // 4chan threads
	],
	/**
	 * Rules to process the elements found by targetQueries
	 * Can be a string or array to match certain attributes
	 * Or a function which gets the element as argument and should return an array of URLs or null
	 */
	targetProcessors: {
		meta: 'content',
		a: 'href',
		link: 'href',
		img: 'src'
	},
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
 * @returns {Promise<Buffer>} The fetched image
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

	if (!options.cookieJar) {
		options.cookieJar = new tough.CookieJar();
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
 * @param {string[]} urls The URLs to fetch an image from, first URL which is successfully fetched is returned
 * @param {Options} options The options for the request
 * @returns {Promise<Buffer>} The fetched image
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
		} catch (error) {
			if (!firstError) {
				firstError = error;
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

	let accepts = requireUtil('get-supported-formats')();

	const hostname = (new URL(url)).hostname;

	if (hostname.endsWith('pixiv.net')) {
		// TODO: To correctly scrape Pixiv we currently have a hardcoded exception
		// Because we must get the HTML version to get the image without the watermark
		// It would be nice if this could not be hardcoded like that
		accepts = ['text/html'];
	} else if (hostname === 'i.pximg.net') {
		url = url.replace(/^https?:\/\/i.pximg.net\/c\/\d+x\d+/, 'https://i.pximg.net');
		url = url.replace(/_square1200.jpg$/, '_master1200.jpg');
	} else {
		accepts.push('image/*;q=0.8', '*/*;q=0.1');
	}

	const res = await fetch(url, {
		...options.fetchOptions,
		headers: {
			...options.fetchOptions.headers,
			Accept: accepts.join(', '),
			Cookie: options.cookieJar.getCookieStringSync(url),
			Referer: options.referer
		}
	});

	try {
		options.cookieJar.setCookieSync(res.headers.get('set-cookie'), url);
	} catch (error) {
		// Cookies can throw for all sort of reasons so we dont need to really handle it
		/// console.log(error);
	}

	if (res.status < 200 || res.status >= 400) {
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
	return fetchImage(...links, {
		...options,
		referer: url
	});
}

/**
 * Attempts to find the image URLs from an HTML buffer
 * @param {buffer} body The HTML buffer to find images in
 * @param {string} baseUrl The URL to use as base for relative links
 * @param {Options} options The options for the request
 * @yields {string} The URLs found
 * @returns {IterableIterator<string>} The URLs found
 */
function * findImages(body, baseUrl, options) {
	let $;

	try {
		$ = cheerio.load(body);
	} catch (error) {
		return;
	}

	const elements = [];

	for (const query of options.targetQueries) {
		elements.push(
			...$(query)
				.get()
				.map(elem => $(elem))
		);
	}

	for (let url of processElements(elements, options.targetProcessors)) {
		try {
			url = new URL(url, baseUrl);
			yield url.href;
		} catch (error) {}
	}
}

/**
 * Called by findImages, processes a bunch of elements
 * @param {CheerioElements[]} elements The elements to process
 * @param {Object<string, string|string[]|Function>} processors The processors to use
 * @param {Options} options The options for the request
 * @yields {string} The URLs found
 * @returns {IterableIterator<string>} The URLs found
 */
function * processElements(elements, processors) {
	for (const elem of elements) {
		// Finds the key that correspond to the element being processed
		const processorKey = Object.keys(processors).find(key =>
			elem.is(key)
		);

		if (!processorKey) {
			console.warn(`findImages: Unable to process ${elem.get().name} element`);
			continue;
		}

		let processor = processors[processorKey];
		let urls;

		// Determine what to do with the processor based on its type
		if (typeof processor === 'function') {
			urls = processor(elem);
		} else {
			if (!Array.isArray(processor)) {
				processor = [processor];
			}

			// Finds an attribute in the processor that the element has
			const attr = processor.find(attr => elem.attr(attr));
			urls = elem.attr(attr);
		}

		if (!Array.isArray(urls)) {
			urls = [urls];
		}

		for (const url of urls) {
			if (url) {
				yield url;
			}
		}
	}
}

fetchImage.FetchImageError = FetchImageError;
fetchImage.defaults = defaultOptions;

module.exports = fetchImage;
