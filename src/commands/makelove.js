const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');
const nick = requireUtil('nick');

const options = {
	aliases: ['makelove'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}]
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	// Run only in Satania Dropout.
	if (message.guild && message.guild.id !== '310180409541394432') {
		return;
	}

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping();

	const image = await render({
		image: './assets/makelove.jpg'
	}, {
		image: fetchImage(relevantLink(message.author).url),
		height: 140,
		width: 140,
		x: 240,
		y: 70,
		background: '#36393e'
	}, {
		image: fetchImage(link.url),
		height: 140,
		width: 140,
		x: 125,
		y: 415,
		background: '#36393e'
	});

	await message.channel.send(`**${nick(message.author, message.channel)}** made love with **${link.name}** successfully! \u2764`, {
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

module.exports = new Command('makelove', exec, options);
