const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['delet', 'delete', 'deletthis', 'deletdis', 'deletethis', 'deletedis'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content',
		default: message => message.author
	}],
	description: 'Sends a picture of you in attac mode to show someone they should really delete their post\n(Your avatar is used by default)\n' +
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
		image: './assets/delet.png'
	}, {
		image: fetchImage(link.url),
		height: 235,
		width: 235,
		x: 10,
		y: 60,
		background: '#36393e'
	});

	await message.channel.send({
		files: [{
			name: 'image.jpeg',
			attachment: await image
				.jpeg({
					quality: 50
				})
				.toBuffer()
		}]
	});

	message.channel.stopTyping();
}

module.exports = new Command('delet', exec, options);
