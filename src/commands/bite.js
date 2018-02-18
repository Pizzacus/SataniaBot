const {Command} = require('discord-akairo');

const fetchImage = requireUtil('fetch-image');
const relevantLink = requireUtil('relevant-link');
const render = requireUtil('render');

const options = {
	aliases: ['bite', 'bit', 'nom'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'Bite someone... In a cute way don\'t worry it won\'t hurt\n' +
		'__**Examples:**__ `s!bite @Example#1234`, `s!bite :CustomEmoji:`, `s!bite` with a file attached'
};

async function exec(message, args) {
	const link = relevantLink(message, args.user);

	if (!link) {
		await message.channel.send('No source found ;-;');
		return;
	}

	await message.channel.startTyping(true);

	const avatar = await fetchImage(link.url);

	if (!avatar) {
		await message.reply('I wasn\'t able to find any image to use ;-;');
		await message.channel.stopTyping();
		return;
	}

	const image = await render({
		image: './assets/bite.jpg'
	}, {
		image: avatar,
		height: 200,
		width: 200,
		x: 120,
		y: 370,
		background: '#36393e'
	}, {
		image: './assets/bite-overlay.png'
	});

	await message.channel.send(`**${link.name}** was bitten successfully >\\_<`, {
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

module.exports = new Command('bite', exec, options);
