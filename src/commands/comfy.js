const {URL} = require('url');
const {Command} = require('discord-akairo');
const fetch = require('make-fetch-happen').defaults(
	requireUtil('fetch-defaults')
);

const nick = requireUtil('nick');
const fixEmbed = requireUtil('fix-embed');

const RATING_ARRAY = [
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

// Max amount of comfiness obtainable
const MAX_COMFY = 1000;

const options = {
	aliases: ['comfy', 'comf', 'howcomf', 'howcomfy'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => message.author
	}],
	description: 'Check your comfiness for tomorrow! If you don\'t mention anyone, the bot will give **your** results\n__**Examples:**__: `s!comfy @Example#1234`, `s!comfy`'
};

/**
 * @typedef {Object} Comfy
 * @description A comfiness value associated to a certain ID and relevant for a certain date
 * @property {string} id The identifier associated to the comfiness value
 * @property {Date} date The date for which the comfiness value is relevant
 * @property {number} comfvalue The amount of comfiness which will occur for the user represented by the ID on the specified date
 */

/**
 * Grabs the comfiness value from Seb's universal comfiness forecasting API
 * @param {string} id Some sort of identifier representing the user, can be any unique value related to them
 * @param {string|number|Date} [date='tomorrow'] The date to check, supports anything that can be parsed by JavaScript's Date objects, or keywords recognized by the API
 * @returns {Comfy} The comfiness value
 */
function getComfy(id, date = 'tomorrow') {
	const url = new URL('http://api.sebg.moe/comf/');

	if (date == null) {
		date = new Date();
	}

	const parsedDate = Date.parse(date);

	if (isNaN(parsedDate)) {
		date = String(date);
	} else {
		const dateboy = new Date(parsedDate);
		date = [
			dateboy.getFullYear(),
			dateboy.getMonth() + 1,
			dateboy.getDate()
		].join('-');
	}

	url.searchParams.set('id', id);
	url.searchParams.set('date', date);

	return fetch(url)
		.then(res => {
			if (res.status < 200 && res.status >= 400) {
				const err = new fetch.FetchError(
					'Status was not ok, it was ' + res.status,
					'not-ok'
				);
				err.status = res.status;

				throw err;
			}

			return res.json();
		})
		.then(body => {
			const result = {
				id,
				comfvalue: Number(body.comfvalue),
				date: new Date(body.date.Y, body.date.M - 1, body.date.D)
			};

			return result;
		});
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

async function exec(message, args) {
	const user = args.user;

	const comfy = await getComfy(user.id);

	const rating = RATING_ARRAY[Math.floor((comfy.comfvalue / (MAX_COMFY + 1)) * RATING_ARRAY.length)];

	return message.channel.send({
		embed: fixEmbed({
			author: {
				name: `Comfiness forecast for ${nick(user, message.channel)}`,
				icon_url: user.displayAvatarURL || user.user.displayAvatarURL // eslint-disable-line camelcase
			},
			title: 'Your forecasted comfiness for tomorrow is:',
			fields: [
				{
					name: `**__${rating}__**   (${(comfy.comfvalue / MAX_COMFY * 100).toFixed(1)} %)`,
					value: `\`[${bar(comfy.comfvalue / MAX_COMFY, 24)}]\``
				}
			],
			footer: {
				text: `Forecast for ${
					comfy.date.toLocaleDateString('en', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}  —  thx Sebberino ♥`
			}
		})
	});
}

module.exports = new Command('comfy', exec, options);
