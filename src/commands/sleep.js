const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['sleep', 'tucc'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'Tucc someone to bed and make them sleep\n' +
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
		image: './assets/sleep.png'
	}, {
		image: fetchImage(link.url),
		height: 96,
		width: 96,
		rotate: 90,
		x: 260,
		y: 110,
		background: '#36393e'
	}, {
		image: './assets/sleep-overlay.png'
	});

	await message.channel.send(`**${link.name}** is now having comfy sleep! 🛏 ✨`, {
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

module.exports = new Command('sleep', exec, options);
