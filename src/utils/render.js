const sharp = require('sharp');
const {optimalDensity} = require('./svg-utils');

const LEGACY_MODES = {
	crop: 'cover',
	embed: 'contain',
	max: 'inside',
	min: 'outside',
	ignoreAspectRatio: 'fill'
};

/**
 * @typedef {Object} ImageOptions
 * @property {Promise<string|Buffer>|Buffer|string} image The image to be used to render.
 * If this is a promise, it will be correctly awaited while the other images will start being processed right away
 * @property {object} [options={}] The options passed to Sharp
 * @property {number} [width] The width of the image in pixels, if undefined the image won't be resized
 * @property {number} [height] The height of the image in pixels, if undefined the image won't be resized
 * @property {number} [x=0] The position of the image on the X axis
 * @property {number} [y=0] The position of the image on the Y axis
 * @property {number} [rotate=0] The angle of rotation (only multiples of 90° are supported)
 * @property {string} [resize='crop'] The method to use when resizing, accepted values are `'crop'`, `'embed'`, `'max'`, `'min'` and `'ignoreAspectRatio'`
 * @property {string} [crop='centre'] The type of crop if the resize mode is set to "crop", see this: http://sharp.dimens.io/en/stable/api-resize/#crop
 * @property {boolean} [withoutEnlargement=false] If resizing the image in a way that it would be enlarged is allowed
 * @property {boolean} [background] Replace transparency with a given background
 * @property {object} [raw] An object with width, height, and channels properties to work with raw data
 */

/**
 * An image to generate
 * @typedef {ImageOptions|string|Buffer} Image
 */

/**
 * Can be used on the .then method of a Sharp promise to make it return an object representing the image in the rendering queue
 * @param {*} extraOptions All the keys in this object will be added to the returned object, use this to pass x and y values
 * @private
 * @returns {ImageOptions} The queuable data
 * @example
 * 	sharp('image.jpg')
 * 		.raw()
 * 		.toBuffer({resolveWithObject: true})
 * 		.then(queueData({
 * 			x: 5,
 * 			y: 10
 * 		});
 */
function queueData(extraOptions) {
	return function ({info, data}) {
		return {
			...extraOptions,
			image: data,
			width: info.width,
			height: info.height,
			raw: {
				width: info.width,
				height: info.height,
				channels: info.channels
			}
		};
	};
}

/**
 * Processes a single layer of the render() function
 * @param {Image} options The image to process
 * @private
 * @returns {Promise<Sharp>} The processed image
 */
async function processImage(options) {
	if (typeof options === 'string' || Buffer.isBuffer(options)) {
		options = {
			image: options
		};
	}

	const awaited = await options.image;
	const sharpOptions = options.options || {};

	// The density is set automatically if it's not already present
	// In order to render SVG images at full resolution
	sharpOptions.density =
		'density' in sharpOptions ?
			sharpOptions.density :
			optimalDensity(awaited, options.width, options.height);

	const image = sharp(awaited, sharpOptions);

	if (options.width || options.height) {
		let fit;

		if ('resize' in options) {
			if (options.resize in LEGACY_MODES) {
				fit = LEGACY_MODES[options.resize];
			} else {
				fit = options.resize;
			}
		}

		image.resize({
			width: options.width,
			height: options.height,
			fit,
			position: options.crop || 'centre',
			background: options.background || '#0000',
			withoutEnlargement: options.withoutEnlargement || false
		});
	}

	if ('background' in options) {
		image.flatten({
			background: options.background
		});
	}

	if ('rotate' in options) {
		image.rotate(options.rotate);
	}

	const output = await image
		.raw()
		.toBuffer({resolveWithObject: true})
		.then(
			queueData({
				x: options.x || 0,
				y: options.y || 0
			})
		);

	return output;
}

/**
 * Composes multiple sharp images together, the advantage over .composite
 * is that this function will work even when the second image goes out
 * of the bounds of the first one.
 * @param {...ImageOptions} images The images to compose
 * @returns {Sharp} The result of the operation
 */
function composeImages(...images) {
	// Sharp cannot overlay images if one goes out of the bounds of the other
	// So instead we can increase the size of the first one to be juuuuust big enough to overlay the others
	// This is done by using the Sharp .extend method, this object contains the parameters which will be passed to the function

	const boundaries = {
		left: Math.min(...images.map(img => img.x)),
		top: Math.min(...images.map(img => img.y)),
		right: Math.max(...images.map(img => img.x + img.width)),
		bottom: Math.max(...images.map(img => img.y + img.height))
	};

	const [base, ...over] = images;

	return sharp(base.image, {raw: base.raw})
		.extend({
			left: base.x - boundaries.left,
			top: base.y - boundaries.top,
			bottom: boundaries.bottom - (base.y + base.height),
			right: boundaries.right - (base.x + base.width),
			background: '#0000'
		})
		.composite(over.map(img => ({
			input: img.image,
			raw: img.raw,
			left: img.x - boundaries.left,
			top: img.y - boundaries.top
		})))
		.raw()
		.toBuffer({resolveWithObject: true})
		.then(
			queueData({
				x: boundaries.left,
				y: boundaries.top
			})
		);
}

/**
 * A function allowing simple render of basic images, with great performances
 * @module render
 * @param {...Image} images The different layers which will be overlayed
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
 * @returns {Promise<Sharp>} A Promise resolving to a Sharp instance, containing the image
 */
function render(...images) {
	return new Promise((resolve, reject) => {
		// "queue" contains the promises of every layer being processed
		const queue = images.map(processImage).map(handlePromise);

		function handlePromise(promise) {
			promise.then(image => {
				// If this was the last thing in the queue then we are done
				if (queue.length <= 1) {
					return resolve(sharp(image.image, {raw: image.raw}));
				}

				// Else, replace the promise in the queue with the resolved value
				queue[queue.indexOf(promise)] = image;
				composeQueue();
			});

			promise.catch(error => {
				// Sharp does not tag its errors so we need to do it ourself
				if (!('type' in error)) {
					error.type = 'render';
				}

				reject(error);
			});

			return promise;
		}

		function composeQueue() {
			// Loops though the queue, if several finished layers are next to each other in the queue,
			// they get merged into one, until eventually we merged everything and we can resolve with the final value
			for (let i = 0; i + 1 < queue.length; i++) { // It's i + 1 because the last element can never be merged anyway
				const consecutive = [];

				while (!(queue[i] instanceof Promise || queue[i] == null)) {
					consecutive.push(queue[i]);
					i++;
				}

				if (consecutive.length > 1) {
					queue.splice(
						i - consecutive.length,
						consecutive.length,
						handlePromise(composeImages(...consecutive))
					);
				}
			}
		}
	});
}

module.exports = render;
