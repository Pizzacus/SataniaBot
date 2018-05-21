const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');

/**
 * Reads the number of colors in the packed infos of an image descriptor gif block
 * @param {number} packedInfos The packed infos to read
 * @returns {number} The amount of colors
 */
function colorAmount(packedInfos) {
	// If there is a color table
	const hasColorTable = packedInfos >> 7;

	// How many colors in the global color table
	const colorTableSize = 2 ** ((packedInfos & 7) + 1);

	return hasColorTable ? colorTableSize : 0;
}

/**
 * Find the end of a data block in a GIF
 * @param {Buffer} buffer The Buffer to search in
 * @param {number} offset The offset at which we start searching in
 * @returns {number} The offset of the end of the block
 */
function dataBlockEnd(buffer, offset = 0) {
	while (buffer[offset] !== 0x00) {
		offset += buffer[offset] + 1;

		if (offset >= buffer.length) {
			throw new Error('This GIF is invalid (No Block End)');
		}
	}

	return offset;
}

/**
 * Speeds up a GIF contained in a Buffer by a certain ratio
 * @param {Buffer} gif The GIF to speed up
 * @param {number} increase The ratio to increase the GIF by
 * @param {number} cap At what point we should stop increasing the speed
 * @returns {Object} An object with an "image" key for the GIF, a "duration" key in hundredths of seconds, and a "max" key indicating if the cap was reached
 */
function speedup(gif, increase, cap = 1) {
	// Reference: http://giflib.sourceforge.net/whatsinagif/bits_and_bytes.html
	//            https://www.w3.org/Graphics/GIF/spec-gif89a.txt

	gif = Buffer.from(gif);
	const frameDelays = [];

	// 1. Take the magic part of the buffer,
	//    and ensure it is a GIF of the 89a specification
	//    (87a cannot have animation)
	const magic = gif.slice(0, 6).toString('ascii');

	if (!magic.startsWith('GIF')) {
		throw new Error('The image is not a GIF');
	}

	if (!magic.endsWith('87a') && !magic.endsWith('89a')) {
		throw new Error('Unsupported variant of the GIF format');
	}

	// 2. Find the amount of colors in the global color table in order to skip it
	const globalColorAmount = colorAmount(gif[10]);
	const globalColorTableEnd = 13 + (globalColorAmount * 3);

	// 3. Loop over every block in the GIF from here
	let i = globalColorTableEnd;

	while (gif[i] !== 0x3B) {
		if (gif[i] === 0x2C) {
			// --- Image Descriptor ---
			const localColorAmount = colorAmount(gif[i + 9]);

			// Skip the 10 Bytes of the image descriptor, the color table, and the 1 Byte of the LZW Minimum Code Size
			i += 10 + (localColorAmount * 3) + 1;
			i = dataBlockEnd(gif, i);
		} else if (gif[i] === 0x21) {
			switch (gif[i + 1]) {
				case 0x01:
				case 0xFF:
					// --- Plain text Extension ---
					// --- Application Extension ---
					// We skip the two first bytes, which are the field label
					// Then, the byte after that indicates where the data starts
					i += 2 + gif[i + 2] + 1;
					i = dataBlockEnd(gif, i);
					break;

				case 0xF9: {
					// --- Graphics Control Extension ---

					// This is our time to shine, we can finally change the delay of an image
					// So basically, the speed gets changed here
					let speed = gif.readInt16LE(i + 4);
					speed = Math.floor(speed / increase);
					speed = Math.max(speed, cap);

					frameDelays.push(speed);

					gif.writeInt16LE(speed, i + 4);

					i += 3 + gif[i + 2];

					break;
				}

				case 0xFE:
					// --- Comment Extension ---
					// This is just block data lol
					i += 2;
					i = dataBlockEnd(gif, i);
					break;

				default:
					throw new Error('This GIF is invalid (Unknown Extension)');
			}
		} else {
			throw new Error('This GIF is invalid (Unknown Block)');
		}

		if (gif[i] !== 0x00) {
			throw new Error('This GIF is invalid (Bad Block End)');
		}

		i++;
	}

	const gifDuration = frameDelays.reduce((acc, val) => acc + val, 0);

	return {
		duration: gifDuration,
		image: gif,
		max: frameDelays.every(delay => delay === cap)
	};
}

const options = {
	aliases: ['faster', 'fast', 'speedup'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => {
			const lastMessage = relevantLink.lastImage(message.channel);

			if (lastMessage) {
				return relevantLink(lastMessage.attachments, lastMessage.embeds);
			}
		}
	}],
	description: 'Speed up a GIF (by default, the last image sent is used)\n' +
		'__**Examples:**__ `s!faster @Example#1234`, `s!faster :CustomEmoji:`, `s!faster` for the last image'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping();

	const image = await fetchImage(link.url);

	let spedup;

	try {
		spedup = speedup(image, 1.25, 2);
	} catch (err) {
		err.type = 'render';
		throw err;
	}

	let text = `Speed: **${Math.round(100 * 60 / spedup.duration * 100) / 100} loops** per minutes`;

	if (spedup.max) {
		text += ' __**(MAX)**__';

		if (spedup.duration > 60) {
			text += '\n\n*Note: Some GIFs have so many frames that making them really fast is simply impossible*';
		}
	}

	await message.channel.send(text, {
		files: [{
			name: 'image.gif',
			attachment: spedup.image
		}]
	});

	await message.channel.stopTyping();
}

module.exports = new Command('faster', exec, options);
