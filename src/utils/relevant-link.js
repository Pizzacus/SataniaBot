const {URL, domainToUnicode} = require('url');
const Discord = require('discord.js');

const {matchURLs, matchEmojis, Link, Emoji} = requireUtil('parse-message');

/**
 * Returns the content of a message handled by Akairo without the prefix and command
 * @param {Akairo.MessageExtensions} message
 * @returns {string} The content of the message
 */
function getArgs(message) {
	if (!message.util) {
		return;
	}

	if (!message.util.prefix || !message.util.alias) {
		return message.content;
	}

	const startIndex =
		message.content.indexOf(message.util.prefix) + message.util.prefix.length;
	const argsIndex =
		message.content.slice(startIndex).search(/\S/) + message.util.prefix.length;

	return message.content.slice(argsIndex + message.util.alias.length + 1);
}

/**
 * Returns a "humanized" url, aka just the domain of the URL, also converts punnycode domains correctly
 * @param {string} url - The URL to humanize
 * @returns {string} The humanized URL
 */
function humanizeURL(url) {
	return domainToUnicode(new URL(url).hostname);
}

/**
 * Normalize a sring to look for the guild name in
 * @param {string} str The string to normalize
 */
function normalize(str) {
	return str.toLowerCase().normalize();
}

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

		if (embed.image) {
			url = embed.image.url;
		} else if (embed.thumbnail) {
			url = embed.thumbnail.url;
		}

		return {
			type: 'embed',
			url,
			name: humanizeURL(url)
		};
	},
	link: link => ({
		type: 'link',
		url: link.url,
		name: humanizeURL(link.url)
	}),
	emoji: emoji => {
		let name = emoji.toString();

		if (emoji.custom && emoji.client && emoji.client.emojis.has(emoji.id)) {
			name = emoji.client.emojis.get(emoji.id).toString();
		}

		return {
			type: 'emoji',
			url: emoji.url,
			name
		};
	},
	message: message => {
		const content = getArgs(message);

		const resolve = [
			message.attachments,
			matchURLs(content),
			message.mentions,
			matchEmojis(content).map(emoji => {
				emoji.client = message.client;
				return emoji;
			})
		];

		if (
			message.guild && (
				content.search(Discord.MessageMentions.EVERYONE_PATTERN) >= 0 ||
				normalize(content).includes(normalize(message.guild.name))
			)
		) {
			resolve.push(message.guild);
		}

		resolve.push(message.embeds);

		// ^^^^ keyword
		if (/^\^+$/.test(content)) {
			const resolvedMessage = [...message.channel.messages.values()]
				.reverse()
				.find(message => {
					return (
						message.embeds.some(embed => embed.image || embed.thumbnail) ||
						message.attachments.size > 0
					);
				});

			if (resolvedMessage) {
				resolve.push(resolvedMessage.attachments, resolvedMessage.embeds);
			}
		}

		return resolveLink(resolve);
	}
};

function resolveLinkItem(item) {
	let link = {};

	if (item === null || item === undefined) {
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

		case Link:
			link = handler.link(item);
			break;

		case Emoji:
			link = handler.emoji(item);
			break;

		default:
	}

	if (!link || !link.url) {
		return null;
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
 * @property {string} type - The type of item found
 * @property {string} url - The URL of the image
 * @property {*} [source] - Whatever object represents the source which was used to find the image, for instance, if this function resolves a mention, this property will be the corresponding user object
 * @property {string} name - The displayable name of the image, may contain Discord markdown and such
 */

/**
 * Find the relevant image in almost any objects from Discord.js that could possibly have an image associated to them.
 *
 * The main use for this function is to find the relevant image in a message.
 *
 * If multiple arguments are passed, the first one which can be resolved will be returned, if nothing can be resolved, 'null' will be returned
 * @param {...*} items - the items to resolve, usually just a Discord Message
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

resolveLink.getArgs = getArgs;
resolveLink.humanizeURL = humanizeURL;

module.exports = resolveLink;
