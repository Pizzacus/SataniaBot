const {Command} = require('discord-akairo');

const nick = requireUtil('nick');

const options = {
	aliases: ['echo', 'say', 'repeat'],
	args: [
		{
			id: 'text',
			match: 'content'
		}
	],
	description: 'Repeat whatever you add after the command'
};

function exec(message, {text}) {
	if (typeof text !== 'string' || text.length === 0) {
		return message.reply('please specify something to say');
	}

	return message.channel.send(
		text.replace(/<@[!&]?(\d+)>/g, (match, id) => {
			const user = message.client.users.get(id);
			const role = message.guild ?
				message.guild.roles.get(id) :
				null;

			let mention;

			if (user) {
				mention = '@' + nick(user, message.channel);
			} else if (role) {
				mention = '@' + role.name;
			} else {
				mention = match;
			}

			return '**' + mention.replace(/<(@[!&]?\d+)>/g, '<\u2060$1>') + '**';
		})
	);
}

module.exports = new Command('echo', exec, options);
