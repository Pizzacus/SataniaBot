const Discord = require('discord.js');
const nick = require('./nick');

/**
 * Returns the displayed name of a channel
 * @param {Discord.Channel|Discord.User} channel The channel to get the name of
 * @returns {String}
 */
function channelName(channel) {
	if (channel instanceof Discord.User) {
		return channel.username;
	}

	if (!(channel instanceof Discord.Channel)) {
		throw new TypeError(
			'The \'channel\' argument must be an instance of a Discord Channel'
		);
	}

	switch (channel.type) {
		case 'dm':
			return channel.recipient.username;

		case 'group':
			if (channel.name === null) {
				const name = channel.recipients
					.filter(user => user.id !== channel.client.user.id)
					.map(user => nick(user, channel))
					.join(', ');

				return name || 'Unnamed';
			}
		// Falls through if it has a name

		case 'text':
		case 'voice':
		case 'category':
			return channel.name;

		default:
			throw new TypeError('Unknown channel type');
	}
}

module.exports = channelName;
