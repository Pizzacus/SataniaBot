const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['kiss', 'kissu', 'kisses'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'When you REALLY wanna give love to someone, you don\'t hug them, you kiss them!\n' +
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
		image: './assets/kiss.png'
	}, {
		image: fetchImage(link.url),
		height: 240,
		width: 240,
		x: 70,
		y: 50,
		background: '#36393e'
	}, {
		image: './assets/kiss-overlay.png'
	});

	await message.channel.send(`**${link.name}** was kissed successfully! \u2764`, {
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

module.exports = new Command('kiss', exec, options);
