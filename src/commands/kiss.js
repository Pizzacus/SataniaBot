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
		'__**Examples:**__ `s!kiss @Example#1234`, `s!kiss :CustomEmoji:`, `s!kiss` with a file attached'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	message.channel.startTyping(true);

	const avatar = await fetchImage(link.url);

	if (!avatar) {
		await message.reply('I wasn\'t able to find any image to use ;-;');
		await message.channel.stopTyping();
		return;
	}

	const image = await render({
		image: './assets/kiss.png'
	}, {
		image: avatar,
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

module.exports = new Command('kiss', exec, options);
