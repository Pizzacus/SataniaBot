const {URL} = require('url');
const fetch = require('make-fetch-happen').defaults(requireUtil('fetch-defaults'));
const cheerio = require('cheerio');
const fileType = require('file-type');

const mergeDeep = requireUtil('merge-deep');
const {isSVG} = requireUtil('svg-utils');

async function fetchImage(url, options = {}) {
	const defaultOptions = {
		imageMime: [
			'image/webp',
			'image/jpeg',
			'image/png',
			'image/svg+xml',
			'image/gif',
			'image/tiff'
		],
		maxDeep: 4,
		targetQueries: [
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
		maxLinksPerPage: 5
	};

	mergeDeep(options, defaultOptions);

	if (options.maxDeep < 1) {
		return null;
	}

	const res = await fetch(url, options.fetchOptions);

	if (!res.status >= 200 && res.status < 400) {
		const err = new fetch.FetchError('Status was not ok, it was ' + res.status, 'not-ok');
		err.status = res.status;

		throw err;
	}

	const body = await res.buffer();
	const type = fileType(body);

	if ((type && options.imageMime.includes(type.mime)) || (options.imageMime.includes('image/svg+xml') && isSVG(body))) {
		return body;
	}

	const $ = cheerio.load(body);

	const links = options.targetQueries.reduce((links, query) => {
		const elements = $(query).get();

		for (let elem of elements) {
			elem = $(elem);

			for (const attr of options.targetAttributes) {
				if (elem.attr(attr)) {
					links.push(new URL(elem.attr(attr), url).href);
					break;
				}
			}
		}

		return links;
	}, []);

	links.splice(options.maxLinksPerPage);

	for (let i = 0; i < links.length; i++) {
		let res;

		try {
			// eslint-disable-next-line no-await-in-loop
			res = await fetchImage(links[i], {
				...options,
				maxDeep: options.maxDeep - 1
			});
		} catch (err) {
			res = null;
		}

		if (res) {
			return res;
		}
	}
}

module.exports = fetchImage;
