const {Inhibitor} = require('discord-akairo');

const options = {};

function exec(message) {
	if (message.channel.type === 'text') {
		const perms = message.channel.permissionsFor(message.client.user);

		if (!perms.has('SEND_MESSAGES')) {
			return message.author.send({
				embed: {
					title: 'I cannot speak in this channel ;-;',
					description: 'However, you can use me in the following channels:\n' +
						message.guild.channels
							.filter(channel => channel.type === 'text' && channel.permissionsFor(message.client.user).has('SEND_MESSAGES'))
							.map(channel => ` • ${channel}`)
							.join('\n')
				}
			}).then(() => Promise.reject());
		}
	}
}

module.exports = new Inhibitor('perm-check', exec, options);
