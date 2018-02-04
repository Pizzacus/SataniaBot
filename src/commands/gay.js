const {Command} = require('discord-akairo');
const seedrandom = require('seedrandom');

const options = {
	aliases: ['gay', 'gya'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => {
			return message.author;
		}
	}],
	description: 'Check how gay someone is! If you don\'t mention anyone, the bot will give **your** results\n__**Examples:**__: `s!gay @Example#1234`, `s!gay`'
};

function exec(message, args) {
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

	const userRNG = seedrandom(args.user.id);
	let gay = numberModifier(userRNG());
	let activity = activityModifier(userRNG());

	if (args.user.id === '216968594662227968') {
		gay = 0.54;
		activity = 0.9;
	} else if (args.user.id === '300721840417013780') {
		gay = 0.85;
		activity = 0.05;
	} else if (args.user.id === '224641749459402762') {
		gay = 0.67;
		activity = 0.87;
	} else if (args.user.id === '312877473706672128') {
		gay = 0.5625;
		activity = 0.8;
	} else if (args.user.id === '254543598928920576') {
		gay = 0.01;
		activity = 0.95;
	}

	let straight = 1 - gay;
	const orientation = (gay + (1 - straight)) / 2;

	gay *= activity;
	straight *= activity;

	const rankingArray = [
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

	let rating = rankingArray[Math.floor(gay * rankingArray.length)];

	if (activity < 0.3) {
		rating = 'Asexual';
	}

	if (args.user.id === '295575141772165121') {
		rating = 'Seksexual';
	}

	return message.channel.send('', {
		embed: {
			title: `Rating: __${rating}__`,
			author: {
				name: `Gay ratings for ${args.user.displayName || args.user.username}`,
				icon_url: args.user.displayAvatarURL || args.user.user.displayAvatarURL // eslint-disable-line camelcase
			},
			fields: [
				{
					name: '  Orientation:',
					value: `\`${bar(orientation, 24)}\`      **Straight:** ${(straight * 100).toFixed(1)}%\n` +
						`◂ Straight                      Gay ▸             **Gay:** ${(gay * 100).toFixed(1)}%\n` +
						// TODO: This next line is terrible smhhhhh
						`                                                      **Asexuality:** ${(100 - (straight * 100).toFixed(1) - (gay * 100).toFixed(1)).toFixed(1)}%`
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
