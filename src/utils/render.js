const sharp = require('sharp');
const {optimalDensity} = require('./svg-utils');

async function processImage(options) {
	const awaited = await options.image;
	const sharpOptions = options.options || {};
	sharpOptions.density = 'density' in sharpOptions ?
		sharpOptions.density :
		optimalDensity(awaited, options.width, options.height);

	const image = sharp(awaited, sharpOptions);

	if (options.width || options.height) {
		const resizeModes = ['crop', 'embed', 'max', 'min', 'ignoreAspectRatio'];

		image.resize(options.width, options.height);

		if (resizeModes.includes(options.resize)) {
			if (options.resize === 'crop') {
				image.crop(options.crop);
			} else if (typeof image[options.resize] === 'function') {
				image[options.resize]();
			}
		}

		if (options.withoutEnlargement) {
			image.withoutEnlargement();
		}
	}

	if (options.background) {
		image.background(options.background).flatten();
	}

	const output = await image
		.raw()
		.toBuffer({resolveWithObject: true})
		.then(({data, info}) => ({
			image: data,
			width: info.width,
			height: info.height,
			x: options.x || 0,
			y: options.y || 0,
			raw: {
				width: info.width,
				height: info.height,
				channels: info.channels
			}
		}));

	return output;
}

function composeImages(a, b) {
	const extension = {
		top: Math.max(0, a.y - b.y),
		left: Math.max(0, a.x - b.x),
		bottom: Math.max(0, (b.y + b.height) - (a.y + a.height)),
		right: Math.max(0, (b.x + b.width) - (a.x + a.width))
	};

	return sharp(a.image, {raw: a.raw})
		.background({r: 0, g: 0, b: 0, alpha: 0})
		.extend(extension)
		.overlayWith(b.image, {
			top: Math.max(0, b.y - a.y),
			left: Math.max(0, b.x - a.x),
			raw: b.raw
		})
		.raw()
		.toBuffer({resolveWithObject: true})
		.then(({data, info}) => ({
			image: data,
			width: info.width,
			height: info.height,
			x: Math.min(a.x, b.x),
			y: Math.min(a.y, b.x),
			raw: {
				width: info.width,
				height: info.height,
				channels: info.channels
			}
		}));
}

/**
 * An image to generate
 * @typedef {Object} Image
 * @property {Promise<string|Buffer>|Buffer|string} image - The image to be used to render.
 * If this is a promise, it will be correctly awaited while the other images will start being processed right away
 * @property {number} [width] - The width of the image in pixels, if undefined the image won't be resized
 * @property {number} [height] - The height of the image in pixels, if undefined the image won't be resized
 * @property {number} [x=0] - The position of the image on the X axis
 * @property {number} [Y=0] - The position of the image on the Y axis
 * @property {string} [resize='crop'] - The method to use when resizing, accepted values are `'crop'`, `'embed'`, `'max'`, `'min'` and `'ignoreAspectRatio'`
 * @property {boolean} [withoutEnlargement=false] - If resizing the image in a way that it would be enlarged is allowed
 * @property {boolean} [background] - The background used, check Sharp.background http://sharp.dimens.io/en/stable/api-colour/#background for more informations
 */

/**
 * A function allowing simple render of basic images
 * @module render
 * @param {...Image} images - The different layers which will be overlayed
 * @example
 * 	const render = requireUtil('render');
 *	const image = await render({
 *		image: './assets/pat.jpg'
 *	}, {
 *		image: avatar,
 *		height: 600,
 *		width: 600,
 *		x: 125,
 *		y: 85,
 *		background: '#36393e'
 *	}, {
 *		image: './assets/pat-overlay.png'
 *	});
 * @returns {Promise<Sharp>} - A Promise resolving to a Sharp instance, containing the image
 */
function render(...images) {
	return (new Promise((resolve, reject) => {
		const queue = images.map(processImage).map(handlePromise);

		function handlePromise(promise) {
			promise.then(image => {
				if (queue.length <= 1) {
					resolve(sharp(image.image, {raw: image.raw}));
				}

				queue[queue.indexOf(promise)] = image;
				composeQueue();
			}).catch(reject);

			return promise;
		}

		function composeQueue() {
			for (const i of queue.keys()) {
				if (i + 1 >= queue.length) {
					break;
				}

				if (!(queue[i] instanceof Promise) && !(queue[i + 1] instanceof Promise)) {
					queue[i] = handlePromise(composeImages(queue[i], queue[i + 1]));
					queue.splice(i + 1, 1);
				}
			}
		}
	})).catch(err => {
		if (!err.type) {
			err.type = 'render';
		}

		throw err;
	});
}

module.exports = render;
