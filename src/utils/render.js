const sharp = require('sharp');
const {optimalDensity} = require('./svg-utils');

/**
 * Can be used on the .then method of a Sharp promise to make it return an object representing the image in the rendering queue
 * @param {*} extraOptions All the keys in this object will be added to the returned object, use this to pass x and y values
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
 */
async function processImage(options) {
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
		// This is actually a list of methods Sharp has to set the resize mode
		const resizeModes = ['crop', 'embed', 'max', 'min', 'ignoreAspectRatio'];

		image.resize(options.width, options.height);

		if (resizeModes.includes(options.resize)) {
			if (options.resize === 'crop') {
				// .crop takes an extra arg so it must be a special case
				image.crop(options.crop);
			} else if (typeof image[options.resize] === 'function') {
				image[options.resize]();
			}
		} else if ('resize' in options) {
			throw new TypeError('Unknown Resize Mode');
		}

		if (options.withoutEnlargement) {
			image.withoutEnlargement();
		}
	}

	if ('background' in options) {
		image.background(options.background).flatten();
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
 * Composes two sharp images together, the advantage over .overlayWith
 * is that this function will work even when the second image goes out
 * of the bounds of the first one.
 * @param {Sharp} a The first image in the back
 * @param {Sharp} b The overlayed image on the front
 */
function composeImages(a, b) {
	// Sharp cannot overlay two images if one goes out of the bounds of the other
	// So instead we can increase the size of the first one to be juuuuust big enough to overlay the second one
	// This is done by using the Sharp .extend method, this object contains the parameters which will be passed to the function

	// Now I know this is all confusing Maths, but, just know that we are calculating margins, to give the other image some space
	const extension = {
		top: Math.max(0, a.y - b.y),
		left: Math.max(0, a.x - b.x),
		bottom: Math.max(0, (b.y + b.height) - (a.y + a.height)),
		right: Math.max(0, (b.x + b.width) - (a.x + a.width))
	};

	return sharp(a.image, {raw: a.raw})
		.background({r: 0, g: 0, b: 0, alpha: 0}) // Background isn't transparent by default and .extend uses the background, sooo
		.extend(extension)
		.overlayWith(b.image, {
			top: Math.max(0, b.y - a.y),
			left: Math.max(0, b.x - a.x),
			raw: b.raw
		})
		.raw()
		.toBuffer({resolveWithObject: true})
		.then(
			queueData({
				x: Math.min(a.x, b.x),
				y: Math.min(a.y, b.x)
			})
		);
}

/**
 * An image to generate
 * @typedef {Object} Image
 * @property {Promise<string|Buffer>|Buffer|string} image - The image to be used to render.
 * If this is a promise, it will be correctly awaited while the other images will start being processed right away
 * @property {object} [options={}] - The options passed to Sharp
 * @property {number} [width] - The width of the image in pixels, if undefined the image won't be resized
 * @property {number} [height] - The height of the image in pixels, if undefined the image won't be resized
 * @property {number} [x=0] - The position of the image on the X axis
 * @property {number} [y=0] - The position of the image on the Y axis
 * @property {string} [resize='crop'] - The method to use when resizing, accepted values are `'crop'`, `'embed'`, `'max'`, `'min'` and `'ignoreAspectRatio'`
 * @property {string} [crop='centre'] - The type of crop if the resize mode is set to "crop", see this: http://sharp.dimens.io/en/stable/api-resize/#crop
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

			promise.catch(err => {
				// Sharp does not tag its errors so we need to do it ourself
				if (!('type' in err)) {
					err.type = 'render';
				}

				reject(err);
			});

			return promise;
		}

		function composeQueue() {
			// Loops though the queue, if two finished layers are next to each other in the queue,
			// they get merged into one, until eventually we merged everything and we can resolve with the final value
			for (let i = 0; i + 1 < queue.length; i++) {
				const a = queue[i];
				const b = queue[i + 1];

				if (!(a instanceof Promise) && !(b instanceof Promise)) {
					queue.splice(i, 2, handlePromise(composeImages(a, b)));
				}
			}
		}
	});
}

module.exports = render;
