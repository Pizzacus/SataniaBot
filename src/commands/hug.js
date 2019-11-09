const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');
const nick = requireUtil('nick');

const options = {
	aliases: ['hug', 'hugs', 'cuddle'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'For hugging people... Because everyone deserves hugs!!!\n' +
	'__**Image command, see below.**__'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping();

	const image = await render({
		image: './assets/hug.jpg'
	}, {
		image: fetchImage(relevantLink(message.author).url),
		height: 275,
		width: 275,
		x: 490,
		y: 45,
		background: '#36393e'
	}, {
		image: fetchImage(link.url),
		height: 275,
		width: 275,
		x: 290,
		y: 245,
		background: '#36393e'
	});

	await message.channel.send(`**${nick(message.author, message.channel)}** hugged **${link.name}** successfully! \u2764`, {
		files: [{
			name: 'image.jpeg',
			attachment: await image
				.jpeg({
					quality: 50
				})
				.toBuffer()
		}]
	});

	await message.channel.stopTyping();
}

module.exports = new Command('hug', exec, options);
