const {Inhibitor} = require('discord-akairo');

const options = {};

async function exec(message, command) {
	if (message.channel.type === 'text') {
		const perms = message.channel.permissionsFor(message.client.user);

		if (!perms.has('SEND_MESSAGES')) {
			if (!(await command.trigger())) {
				const usuableChannels = message.guild.channels.filter(
					channel =>
						channel.type === 'text' &&
						channel
							.permissionsFor(message.client.user)
							.has('VIEW_CHANNEL', 'SEND_MESSAGES') &&
						channel
							.permissionsFor(message.author)
							.has('VIEW_CHANNEL', 'SEND_MESSAGES')
				);

				let description;

				if (usuableChannels.size > 0) {
					description =
						'However, you can use me in the following channels:\n' +
						usuableChannels.map(channel => ` • ${channel}`).join('\n');
				} else {
					description =
						'And it seems like you can\'t use me in any channel ' +
						'on this server, maybe you should tell a mod about that >_<';
				}

				await message.author
					.send({
						embed: {
							title: 'I cannot speak in this channel ;-;',
							description
						}
					});
			}

			return Promise.reject();
		}
	}
}

module.exports = new Inhibitor('perm-check', exec, options);
