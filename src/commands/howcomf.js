const childProcess = require('child_process');
const {Command} = require('discord-akairo');
const seedrandom = require('seedrandom');

const nick = requireUtil('nick');
const fixEmbed = requireUtil('fix-embed');

const options = {
	aliases: ['comf', 'comfy', 'howcomf', 'howcomfy'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => message.author
	}],
	description: 'Check how gay someone is! If you don\'t mention anyone, the bot will give **your** results\n__**Examples:**__: `s!gay @Example#1234`, `s!gay`'
};

function getComfy(id) {
	function pythonComfy(seed) {
		if (typeof seed !== 'number' && typeof seed !== 'string') {
			throw new TypeError('Seed must be a String or a Number');
		}

		const child = childProcess.spawnSync('python', [
			'-c',
			[
				'import random, sys',
				`random.seed(${JSON.stringify(String(seed))})`,
				'sys.stdout.write(str(random.randrange(1001) / 10))'
			].join('\n')
		]);

		if (child.error) {
			if (child.error.code !== 'ENOENT') {
				console.error(child.error);
			}

			return null;
		}

		return parseFloat(child.stdout.toString().trim());
	}

	function javascriptComfy(seed) {
		const rng = seedrandom(seed);
		return Math.floor(rng() * 1001) / 10;
	}

	const now = new Date();
	const seed = id + [
		now.getFullYear(),
		(now.getMonth() + 1).toString().padStart(2, '0'),
		now.getDate().toString().padStart(2, '0')
	].join('-');

	const pycomf = pythonComfy(seed);

	if (!Number.isFinite(pycomf)) {
		return javascriptComfy();
	}

	return pycomf;
}

/**
 * Generates a progression bar
 * @param {number} value Progression between 0 and 1
 * @param {number} size Size of the bar
 * @param {string[]} [chars] The characters to use, the lower the index the lower the progression
 * @returns {string} The progression bar
 */
function bar(value, size, chars = [' ', '▌', '█']) {
	let barString = '';

	for (let i = 0; i < size; i++) {
		const charProgress = (value * size) - i;
		barString +=
			chars[
				Math.min(
					chars.length - 1,
					Math.max(0, Math.floor(charProgress * chars.length))
				)
			];
	}

	return barString;
}

function exec(message, args) {
	const user = args.user;

	const comfy = getComfy(user.id);

	const ratingArray = [
		'MEGA COMFY',
		'EXTREMELY Comfy',
		'VERY Comfy',
		'Pretty Comfy',
		'Comfy',
		'A Little Comfy',
		'Not Very Comfy...',
		'Not Comfy...',
		'N O   C O M F Y'
	].reverse();

	const rating = ratingArray[Math.floor((comfy / 100) * ratingArray.length)];

	return message.channel.send({
		embed: fixEmbed({
			author: {
				name: `Comfiness prediction for ${nick(user, message.channel)}`,
				icon_url: user.displayAvatarURL || user.user.displayAvatarURL // eslint-disable-line camelcase
			},
			title: 'Your predicted comfiness for tomorrow is:',
			fields: [
				{
					name: `**__${rating}__**   (${comfy} %)`,
					value: `\`[${bar(comfy / 100, 24)}]\``
				}
			],
			footer: {
				text: `Prediction for ${
					new Date(
						Date.now() + (1000 * 60 * 60 * 24)
					).toLocaleDateString('en', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}  —  thx Sebberino ♥`
			}
		})
	});
}

module.exports = new Command('comfy', exec, options);
