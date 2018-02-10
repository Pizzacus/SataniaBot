const fs = require('fs');
const {Command} = require('discord-akairo');
const seedrandom = require('seedrandom');
const yaml = require('js-yaml');

let overrides = {};

if (fs.existsSync('src/commands/gay-overrides.yml')) {
	overrides = yaml.safeLoad(fs.readFileSync('src/commands/gay-overrides.yml'), 'utf8');
}

const options = {
	aliases: ['gay', 'gya'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => message.author
	}],
	description: 'Check how gay someone is! If you don\'t mention anyone, the bot will give **your** results\n__**Examples:**__: `s!gay @Example#1234`, `s!gay`'
};

function exec(message, args) {
	const user = args.user;

	function numberModifier(x) {
		return (Math.cos((x + 1) * Math.PI) * 0.5) + 0.5;
	}

	function activityModifier(x) {
		return Math.cos((Math.cos((x + 1) * Math.PI / 2) + 1) * Math.PI / 2);
	}

	function bar(value, size) {
		const barString = '─'.repeat(size).split('');
		barString[Math.round(value * size)] = '⦿';
		return barString.join('');
	}

	function percent(value) {
		return (value * 100).toFixed(1) + '%';
	}

	const userRNG = seedrandom(user.id);
	let gay = numberModifier(userRNG());
	let activity = activityModifier(userRNG());

	let override = {};

	if (user.id in overrides) {
		override = overrides[user.id];
	}

	console.dir(override);

	if ('gay' in override) {
		gay = override.gay;
	}

	if ('activity' in override) {
		activity = override.activity;
	}

	let straight = 1 - gay;
	const orientation = (gay + (1 - straight)) / 2;

	gay *= activity;
	straight *= activity;

	const ratingArray = [
		'VERY Straight',
		'Pretty Straight',
		'A Little Straight',
		'Bisexual But Also A Little Straight',
		'Bisexual',
		'Bisexual But Also A Little Gay',
		'A Little Gay',
		'Pretty Gay',
		'VERY Gay'
	];

	let rating = ratingArray[Math.floor(gay * ratingArray.length)];

	if (activity < 0.3) {
		rating = 'Asexual';
	}

	if ('rating' in override) {
		rating = override.rating;
	}

	return message.channel.send({
		embed: {
			title: `Rating: __${rating}__`,
			author: {
				name: `Gay ratings for ${user.displayName || user.username}`,
				icon_url: user.displayAvatarURL || user.user.displayAvatarURL // eslint-disable-line camelcase
			},
			fields: [
				{
					name: '  Orientation:',
					value: `\`${bar(orientation, 24)}\`      **Straight:** ${percent(straight)}\n` +
						`◂ Straight                      Gay ▸             **Gay:** ${percent(gay)}\n` +
						`                                                      **Asexuality:** ${percent(1 - activity)}`
				},
				{
					name: 'Sexual Activity:',
					value: `\`${bar(activity, 24)}\`\n◂ Low                           High ▸`
				}
			]
		}
	});
}

module.exports = new Command('gay', exec, options);
