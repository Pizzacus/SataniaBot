const Discord = require('discord.js');

/**
 * Gets the displayed name of a user in any channel
 * @param {Discord.User|Discord.GuildMember} user The user to get the displayed name of
 * @param {Discord.Channel} channel The channel where the name applies
 * @param {boolean} [withHash=false] If the discriminator should be included at the end
 * @returns {string} The displayed name of the user
 */
function nick(user, channel, withHash = false) {
	if (!(channel instanceof Discord.Channel)) {
		throw new TypeError(
			'Argument \'channel\' must be an instance of a Discord Channel'
		);
	}

	if (user instanceof Discord.GuildMember) {
		user = user.user;
	}

	if (!(user instanceof Discord.User)) {
		throw new TypeError(
			'Argument \'user\' must be an instance of a Discord GuildMember or User'
		);
	}

	let name = user.username;

	// Group DM channels with nicknames
	if (
		channel instanceof Discord.GroupDMChannel &&
		channel.nicks &&
		channel.nicks.has(user.id)
	) {
		name = channel.nicks.get(user.id);
	}

	// Voice channels, Guild Text Channels, and Category Channels
	if (
		channel instanceof Discord.GuildChannel &&
		channel.guild.members.has(user.id)
	) {
		name = channel.guild.members.get(user.id).displayName;
	}

	return name + (withHash ? '#' + user.discriminator : '');
}

module.exports = nick;
