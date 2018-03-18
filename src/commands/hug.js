const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');
const nick = requireUtil('nick');

const options = {
	aliases: ['hug', 'hugs'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'For hugging people... Because everyone diserves hugs!!!\n__**Examples:**__ `s!hug @Example#1234`, `s!hug :CustomEmoji:`, `s!hug` with a file attached'
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
		image: './assets/hug.jpg'
	}, {
		image: fetchImage(relevantLink(message.author).url),
		height: 275,
		width: 275,
		x: 490,
		y: 45,
		background: '#36393e'
	}, {
		image: avatar,
		height: 275,
		width: 275,
		x: 290,
		y: 245,
		background: '#36393e'
	});

	await message.channel.send(`**${nick(message.author, message.channel)}** hugged **${link.name}** successfully! \u2764`, {
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

module.exports = new Command('hug', exec, options);
