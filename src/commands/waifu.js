const {Command} = require('discord-akairo');
const seedrandom = require('seedrandom');

const waifuTypes = [
	'Childish',
	'Gloomy',
	'Masochist',
	'Lazy',
	'Creepy',
	'Dandere',
	'Shy Stalker',
	'Kuudere',
	'Dere-Dere',
	'Protective',
	'Tsundere',
	'Derp',
	'Insane',
	'Violent',
	'Oujou-sama',
	'Smart',
	'Perverted',
	'Potty-Mouth',
	'Sadist',
	'Possessive',
	'Average',
	'Random',
	'"I\'ll do anything for you!"',
	'Badass',
	'Yandere',
	'Obsessive',
	'Best Friend',
	'Trap',
	'Cute Loli',
	'Tomboy',
	'Furry'
];

const ratings = [
	'     \u2009Cuteness',
	'    \u2009Lewdness',
	'Friendliness',
	' Intelligence'
];

const cupSizes = [
	'AA',
	'A',
	'B',
	'C',
	'D',
	'DD'
];

// Blood types rarity in Tokyo
// According to http://nbakki.hatenablog.com/entry/ABO_Blood_Type_Distribution_in_Japan
const bloodTypes = {
	'A-': 0.0020,
	'A+': 0.3980,
	'O-': 0.0015,
	'O+': 0.2990,
	'B-': 0.0010,
	'B+': 0.1990,
	'AB-': 0.0005,
	'AB+': 0.0990
};

const options = {
	aliases: ['waifu', 'waifustats'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => message.author
	}],
	description: 'Get the waifu stats of you, or someone else!\n__**Examples:**__: `s!waifu @Example#1234`, `s!waifu`'
};

function exec(message, args) {
	const user = args.user;

	/**
	 * Generates a progression bar
	 * @param {number} value Progression between 0 and 1
	 * @param {number} size Size of the bar
	 * @param {attay} [chars] The characters to use, the lower the index the lower the progression
	 */
	function bar(value, size, chars = [' ', '▌', '█']) {
		let barString = '';

		for (let i = 0; i < size; i++) {
			const charProgress = (value * size) - i;
			barString += chars[
				Math.min(chars.length - 1,
					Math.max(0,
						Math.floor(charProgress * chars.length)
					)
				)
			];
		}

		return barString;
	}

	function numberModifier(x) {
		// Okay I can understand that this might be really complicated : /
		// https://www.desmos.com/calculator/7bchmabdjw
		// Basically, if you pass a random value between 0 and 1 to this function,
		// it makes the ones around 0.5 more frequent and rarer around 1 and 0
		return (Math.cos((Math.cos((x + 0.5 + Math.floor(x + 0.5)) * Math.PI) + 1) * Math.PI / 2) / 2) + Math.floor(x + 0.5);
	}

	const userRNG = seedrandom('waifu-' + user.id);

	// The type of the waifu
	let type = waifuTypes[Math.floor(userRNG() * waifuTypes.length)];

	if (user.id === message.client.user.id) {
		type = 'BEST WAIFU';
	}

	// The scores, we need to calculate all of them first to then divide them with their total when added
	const scores = ratings.map(() => userRNG());
	const total = scores.reduce((acc, score) => acc + score, 0);

	// Loops over attributes to create the description
	const description = ratings.reduce((description, rating, i) => {
		const score = scores[i] / total;
		const displayScore = (score * 100).toFixed(1).padStart(5, ' ') + '%';

		// Unicode Word-Joiner, allows us to avoid whitespace trimming
		description += `**${rating}**: \`\u2060${displayScore} [${bar(score, 15)}]\`\n`;
		return description;
	}, '');

	let infos = '\u2060'; // Unicode Word-Joiner, same as above

	// === HEIGHT ===
	const heightMetric = (numberModifier(userRNG()) * 60) + 120;
	const heightImperial = Math.round(heightMetric / 2.54);

	// \u2009 is a thin whitespace, it should be used between units and numbers
	infos += `        **Height**: ${Math.round(heightMetric)}\u2009cm / ${Math.floor(heightImperial / 12)}'${heightImperial % 12}"\n`;

	// === WEIGHT ===
	// Weight is calculated by aiming to obtain a realistical BMI between 17 and 24
	// The BMI is a ratio to determine if a certain weight is anormal compared to a certain height
	// A normal BMI is between 18.5-25, we just made it a little lower because waifus are thinnnnn
	const minWeight = 17 * ((heightMetric / 100) ** 2);
	const maxWeight = 24 * ((heightMetric / 100) ** 2);
	const weight = (numberModifier(userRNG()) * (maxWeight - minWeight)) + minWeight;

	infos += `       **Weight**: ${Math.round(weight)}\u2009kg / ${Math.round(weight * 2.2046226218)}\u2009lb\n`;

	// === BLOOD TYPE ===
	let acc = 0;
	const bloodVal = userRNG();
	const bloodType = Object.entries(bloodTypes).find(val => {
		acc += val[1];
		return acc > bloodVal;
	})[0];

	infos += `**Blood Type**: ${bloodType}\n`;

	// === CUP SIZE ==
	const cupSize = userRNG();

	if (cupSize > 0.98) {
		infos += '     **Cup Size**: Too big to be measured\n';
	} else {
		infos += `     **Cup Size**: '${cupSizes[Math.floor(cupSizes.length * cupSize)]}' in US Size [(?)](http://www.sizeguide.net/bra-sizes.html)\n`;
	}

	return message.channel.send({
		embed: {
			title: `Waifu Type: __${type}__`,
			description,
			author: {
				name: `Waifu ratings for ${user.displayName || user.username}`,
				icon_url: user.displayAvatarURL || user.user.displayAvatarURL // eslint-disable-line camelcase
			},
			fields: [
				{
					name: 'Informations',
					value: infos
				}
			]
		}
	});
}

module.exports = new Command('waifu', exec, options);
