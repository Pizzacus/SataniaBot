const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');
const nick = requireUtil('nick');

const options = {
	aliases: ['horny'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'A command for people who act too horny\n' +
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
		image: './assets/horny.jpg'
	}, {
		image: fetchImage(relevantLink(message.author).url),
		height: 150,
		width: 150,
		x: 45,
		y: 310,
		background: '#36393e'
	});

	await message.channel.send(`**${nick(message.author, message.channel)}** threw **${link.name}** to the horny jail!`, {
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

module.exports = new Command('horny', exec, options);
