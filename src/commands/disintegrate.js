const {Command} = require('discord-akairo');
const sharp = require('sharp');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const nick = requireUtil('nick');
const {optimalDensity} = requireUtil('svg-utils');

const TRIANGLE_SIZE_RATIO = 50;
const IMAGE_MARGIN = 0.25;
const OVERPRINT = 1;

const options = {
	aliases: ['disintegrate', 'desintegrate', 'thanos', 'idontfeelsogood', 'idfsg', 'idontwannago', 'idwg'],
	args: [
		{
			id: 'user',
			type: 'relevant',
			match: 'content'
		}
	],
	description:
		'Desintegrate someone like in that big Avengers movie that just came out\n' +
		'__**Examples:**__ `s!disintegrate`, `s!disintegrate @Example#1234`, `s!disintegrate :CustomEmoji:`, `s!disintegrate` with a file attached'
};

async function exec(message, {user}) {
	const link = relevantLink(message, user);

	if (!link) {
		return message.reply(
			'Please specify something to disintegrate (a user, emoji, link, anything really)'
		);
	}

	message.channel.startTyping();

	const image = await fetchImage(link.url);

	// Allows us to get infos about the image and normalize the size and format
	return sharp(image, {
		density: optimalDensity(image, 300, 300)
	})
		.resize({
			width: 300,
			height: 300,
			fit: 'inside'
		})
		.png()
		.toBuffer({
			resolveWithObject: true
		})
		.then(({data, info}) => {
			const direction = Math.random() > 0.5 ? 'left' : 'right';

			const marginTop = info.height * IMAGE_MARGIN;
			const marginLeft = direction === 'left' ? info.width * IMAGE_MARGIN : 0;

			const size = Math.min(info.width, info.height) / TRIANGLE_SIZE_RATIO;

			// Point at which the strength of the effect is 0
			// The strength is decided based on the distance from this point
			let refX;
			let refY;

			if (direction === 'left') {
				refX = info.width / size;
				refY = info.height / size;
			} else {
				refX = 0;
				refY = info.height / size;
			}

			let svg = `
				<svg
					version="1.1"
					baseProfile="full"
					xmlns="http://www.w3.org/2000/svg"
					xmlns:xlink="http://www.w3.org/1999/xlink"
					xmlns:ev="http://www.w3.org/2001/xml-events"
					width="${info.width * (IMAGE_MARGIN + 1)}"
					height="${info.height * (IMAGE_MARGIN + 1)}"
				>
					<defs>
						<pattern
							id="background"
							patternUnits="userSpaceOnUse"
							width="${info.width * (IMAGE_MARGIN + 1)}"
							height="${info.height * (IMAGE_MARGIN + 1)}"
						>
							<image
								xlink:href="data:image/${info.format};base64,${data.toString('base64')}"
								x="${marginLeft}"
								y="${marginTop}"
								width="${info.width}"
								height="${info.height}"
							/>
						</pattern>
					</defs>
			`;

			for (let x = 0; x <= info.width / size; x += 0.5) {
				for (let y = 0; y <= info.height / size; y++) {
					const points = [];

					if ((y + (x * 2)) % 2) {
						points.push(
							[
								'M',
								(x * size) + marginLeft,
								((y + 1) * size) + marginTop + OVERPRINT
							],
							[
								'l',
								(size / 2) + OVERPRINT,
								-size - (OVERPRINT * 2)
							],
							[
								'l',
								-size - (OVERPRINT * 2),
								0
							]
						);
					} else {
						points.push(
							[
								'M',
								(x * size) + marginLeft,
								(y * size) + marginTop - OVERPRINT
							],
							[
								'l',
								(size / 2) + OVERPRINT,
								size + (OVERPRINT * 2)
							],
							[
								'l',
								-size - (OVERPRINT * 2),
								0
							]
						);
					}

					const distance = Math.abs(Math.sqrt(((x - refX) ** 2) + ((y - refY) ** 2))) + (Math.random() * 10);

					const effectStrength = Math.max(0, distance - (Math.max(info.width, info.height) / size));
					const effectAngle = (Math.random() * 22.5) + (direction === 'left' ? 236.25 : 326.25);

					const transformX = (effectStrength * 0.8) * size * Math.cos(effectAngle / 180 * Math.PI);
					const transformY = (effectStrength * 0.8) * size * Math.sin(effectAngle / 180 * Math.PI);

					const opacity = 1 - Math.min(effectStrength / 15, 1);

					if (opacity > 0) {
						svg += `<path
							fill="url(#background)"
							d="${points.map(point => point.shift() + point.join(',')).join('')}"
							transform="translate(${transformX}, ${transformY})"
							opacity="${opacity}"
						/>`;
					}
				}
			}

			svg += '</svg>';

			return sharp(Buffer.from(svg))
				.trim()
				.png()
				.toBuffer();
		})
		.then(image => {
			message.channel.stopTyping();

			return message.channel.send(`"**${nick(message.author, message.channel)}**, I don't feel so good"`, {
				files: [image]
			});
		});
}

module.exports = new Command('disintegrate', exec, options);
