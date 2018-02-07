const {Inhibitor} = require('discord-akairo');

const options = {};

function exec(message) {
	if (message.channel.type === 'text') {
		const perms = message.channel.permissionsFor(message.client.user);

		if (!perms.has('SEND_MESSAGES')) {
			return message.author.send('You cannot use this bot in this channel.')
				.then(() => Promise.reject());
		}
	}
}

module.exports = new Inhibitor('perm-check', exec, options);
