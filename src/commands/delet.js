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
		'__**Examples:**__ `s!delet`, `s!delet @Example#1234`, `s!delet :CustomEmoji:`, `s!delet` with a file attached'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	message.channel.startTyping();

	const avatar = await fetchImage(link.url);

	if (!avatar) {
		await message.reply('I wasn\'t able to find any image to use ;-;');
		await message.channel.stopTyping();
		return;
	}

	const image = await render({
		image: './assets/delet.png'
	}, {
		image: avatar,
		height: 235,
		width: 235,
		x: 10,
		y: 60,
		background: '#36393e'
	});

	await message.channel.send({
		files: [{
			name: `${link.name}.jpeg`,
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
