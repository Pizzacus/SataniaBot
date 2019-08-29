const {Command} = require('discord-akairo');

const options = {
	aliases: ['invite', 'join', 'add'],
	description: 'Get a link to invite me to your server!'
};

async function exec(message) {
	const link = await message.client.generateInvite([
		'VIEW_CHANNEL',
		'SEND_MESSAGES',
		'USE_EXTERNAL_EMOJIS',
		'ADD_REACTIONS',
		'EMBED_LINKS',
		'ATTACH_FILES'
	]);

	return message.channel.send(
		'♥ **Thank you for inviting me to your server!**\n\n' +
		`Just open this link in your browser and follow the instructions!\n**<${link}>**`
	);
}

module.exports = new Command('invite', exec, options);
