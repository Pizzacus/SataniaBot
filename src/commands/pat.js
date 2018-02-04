const Discord = require('discord.js');
const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['pat', 'pet', 'pats', 'pets'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'Sends a picture of someone being pat, we only provide the comfiest pats!\n' +
		'__**Examples:**__ `s!pat @Example#1234`, `s!pat :CustomEmoji:`, `s!pat` with a file attached'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping();

	if (link.source instanceof Discord.User && link.source.id === message.author.id) {
		await message.channel.send(`${message.author}, are you really that desperate to be patted?`, {
			files: [{
				attachment: './assets/sadness.gif'
			}]
		});
		await message.channel.stopTyping();
		return;
	}

	const avatar = await (fetchImage(link.url).catch(async err => {
		await message.reply('An error occured while trying to get your image, I\'m sorry, check that the URL is correct please ;-;', {
			files: ['./assets/error.jpg']
		});
		await message.channel.stopTyping();
		throw err;
	}));

	if (!avatar) {
		await message.reply('I wasn\'t able to find any image to use ;-;');
		await message.channel.stopTyping();
		return;
	}

	const image = await render({
		image: './assets/pat.jpg'
	}, {
		image: avatar,
		height: 600,
		width: 600,
		x: 125,
		y: 85,
		background: '#36393e'
	}, {
		image: './assets/pat-overlay.png'
	});

	await message.channel.send(`**${link.displayName}** was patted successfully! \u2764`, {
		files: [{
			name: `${link.name}.jpeg`,
			attachment: await image
				.jpeg({
					quality: 50
				})
				.toBuffer()
		}]
	});

	await message.channel.stopTyping();
}

module.exports = new Command('pat', exec, options);
