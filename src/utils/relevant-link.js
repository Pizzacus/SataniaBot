const Discord = require('discord.js');

const {matchURLs, matchEmojis, Link, Emoji} = requireUtil('parse-message');
const nick = requireUtil('nick');
const {domain} = requireUtil('url-utils');
const channelName = requireUtil('channel-name');

/**
 * Returns the content of a message handled by Akairo without the prefix and command
 * @param {Akairo.MessageExtensions} message The message to get the content from
 * @returns {string} The content of the message
 */
function getArgs(message) {
	if (
		message.util == null ||
		message.util.prefix == null ||
		message.util.alias == null
	) {
		return message.content;
	}

	const startIndex =
		message.content.indexOf(message.util.prefix) + message.util.prefix.length;
	const argsIndex =
		message.content.slice(startIndex).search(/\S/) + message.util.prefix.length;

	return message.content.slice(argsIndex + message.util.alias.length + 1);
}

/**
 * Normalize a sring to look for the guild name in
 * @param {string} str The string to normalize
 * @returns {string} The normalized string
 */
function normalize(str) {
	return str.toLowerCase().normalize();
}

/**
 * Compares two Discord IDs (you can't compare big number strings easily)
 * @param {string|number} a The ID to compare against b
 * @param {string|number} b The ID to compare against a
 * @returns {number} -1 if a < b, 0 if a == b and 1 if a > b
 */
function compareIDs(a, b) {
	a = typeof a === 'object' ? a.id : a;
	b = typeof b === 'object' ? b.id : b;

	if (
		typeof a === 'string' &&
		typeof b === 'string' &&
		a.length !== b.length
	) {
		return a.length < b.length ? -1 : 1;
	}

	if (a !== b) {
		return a < b ? -1 : 1;
	}

	return 0;
}

/**
 * Checks if the message contains an image
 * @param {Discord.Message} message The message to check for images
 * @returns {boolean} If the message contained an image
 */
function hasImage(message) {
	return (
		message.embeds.some(
			embed =>
				embed.image != null ||
				embed.thumbnail != null
		) ||
		message.attachments.some(
			attachment =>
				attachment.height != null ||
				attachment.width != null
		)
	);
}

function lastImage(channel, findAll) {
	const messages = [...channel.messages.values()];

	messages.sort(compareIDs);
	messages.reverse();

	const imageMessages = messages.filter(hasImage);

	if (findAll) {
		return imageMessages;
	}

	return imageMessages[0];
}

/**
 * @type {Object<string, function<ResolvedLink>}
 */
const handler = {
	guild: guild => ({
		type: 'guild',
		url: guild.iconURL,
		name: guild.name
	}),
	user: user => ({
		type: 'user',
		url: user.avatar ?
			`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp` :
			user.defaultAvatarURL,
		animatedURL: (typeof user.avatar === 'string' && user.avatar.startsWith('a_')) ?
			`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif` :
			null,
		name: user.username
	}),
	member: member => ({
		...handler.user(member.user),
		type: 'member',
		name: member.displayName
	}),
	attachment: attachment => ({
		type: 'attachment',
		url: attachment.url,
		name: attachment.filename
	}),
	embed: embed => {
		let url = null;
		let name = null;

		if (embed.image) {
			url = embed.image.proxyURL;
			name = domain(embed.image.url);
		} else if (embed.thumbnail) {
			url = embed.thumbnail.proxyURL;
			name = domain(embed.thumbnail.url);
		}

		return {
			type: 'embed',
			url,
			name
		};
	},
	link: link => ({
		type: 'link',
		url: link.url,
		name: domain(link.url)
	}),
	emoji: emoji => {
		let name = emoji.toString();

		if (emoji.custom && emoji.client && emoji.client.emojis.has(emoji.id)) {
			name = emoji.client.emojis.get(emoji.id).toString();
		}

		return {
			type: 'emoji',
			url: emoji.staticURL,
			animatedURL: emoji.animated ?
				emoji.url :
				null,
			name
		};
	},
	channel: channel => ({
		type: 'channel',
		url: channelName.icon(channel),
		name: channelName(channel)
	}),
	message: message => {
		const content = getArgs(message);

		const resolve = [
			message.attachments,
			matchURLs(content),
			message.mentions,
			matchEmojis(content)
		];

		const channelContainerName = message.guild instanceof Discord.Guild ?
			message.guild.name :
			channelName(message.channel);

		if (
			content.search(Discord.MessageMentions.EVERYONE_PATTERN) >= 0 ||
			normalize(content).includes(normalize(channelContainerName))
		) {
			if (message.guild == null) {
				resolve.push(message.channel);
			} else {
				resolve.push(message.guild);
			}
		}

		resolve.push(message.embeds);

		// ^^^^ keyword, it is pretty important to trim the content,
		// as the regex would report a match on a string that is only spaces
		if (/^[\^＾˄ˆᶺ⌃\s]+$/.test(content.trim())) {
			const lastMessage = lastImage(message.channel);

			if (lastMessage) {
				resolve.push(lastMessage.attachments, lastMessage.embeds);
			}
		}

		const link = resolveLink(resolve);

		if (link && link.type === 'user' && link.source instanceof Discord.User) {
			link.name = nick(link.source, message.channel);
		}

		if (link && link.type === 'emoji') {
			const emoji = link.source;

			if (emoji.custom && message.client.emojis.has(emoji.id)) {
				link.name = message.client.emojis.get(emoji.id).toString();
			}
		}

		return link;
	}
};

function resolveLinkItem(item) {
	let link = {};

	if (item == null) {
		return null;
	}

	switch (item.constructor) {
		case Discord.Guild:
			link = handler.guild(item);
			break;

		case Discord.GuildMember:
			link = handler.member(item);
			break;

		case Discord.User:
			link = handler.user(item);
			break;

		case Discord.MessageAttachment:
			link = handler.attachment(item);
			break;

		case Discord.MessageEmbed:
			link = handler.embed(item);
			break;

		case Discord.MessageMentions:
			link = resolveLink(item.members, item.users);
			break;

		case Discord.Message:
			link = handler.message(item);
			break;

		case Discord.TextChannel:
		case Discord.GroupDMChannel:
		case Discord.DMChannel:
			link = handler.channel(item);
			break;

		case Link:
			link = handler.link(item);
			break;

		case Emoji:
			link = handler.emoji(item);
			break;

		default:
	}

	if (link == null || link.url == null) {
		return null;
	}

	if (!('animatedURL' in link)) {
		link.animatedURL = null;
	}

	if (typeof link.name === 'string') {
		// Adds an invisible "Word-Joiner" inside mentions
		// To be 100% sure the bot can't be manipulated into pinging people
		link.name = link.name.replace(/<(@[!&]?\d+)>/g, '<\u2060$1>');
	}

	return {
		source: item,
		...link
	};
}

/**
 * @typedef {Object} ResolvedLink
 * @property {string} type The type of item found
 * @property {string} url The URL of the image, static if possible
 * @property {?string} animatedURL The URL to the animated version of the image, null if there is none
 * @property {*} [source] Whatever object represents the source which was used to find the image, for instance, if this function resolves a mention, this property will be the corresponding user object
 * @property {string} name The displayable name of the image, may contain Discord markdown and such
 */

/**
 * Find the relevant image in almost any objects from Discord.js that could possibly have an image associated to them.
 *
 * The main use for this function is to find the relevant image in a message.
 *
 * If multiple arguments are passed, the first one which can be resolved will be returned, if nothing can be resolved, 'null' will be returned
 * @param {...*} items the items to resolve, usually just a Discord Message
 * @returns {?ResolvedLink} The resolved image
 */
function resolveLink(...items) {
	if (items.length <= 1) {
		const item = items[0];

		if (item instanceof Map) {
			items = [...items[0].values()];
		} else if (Array.isArray(item)) {
			items = item;
		} else {
			return resolveLinkItem(item);
		}
	}

	for (let item of items) {
		item = resolveLink(item);
		if (item) {
			return item;
		}
	}

	return null;
}

module.exports = resolveLink;
module.exports.getArgs = getArgs;
module.exports.lastImage = lastImage;
