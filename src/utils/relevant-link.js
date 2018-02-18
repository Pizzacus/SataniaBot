const {URL, domainToUnicode} = require('url');
const Discord = require('discord.js');
const regexEmojis = require('emoji-regex');

const regexCustomEmojis = () => /<a?:(\w+):(\d+)>/g;

/**
 * @typedef {Object} url
 * @property {string} url - The URL matched, without the < and > if it was delimited
 * @property {number} start - The position where the URL started in the string
 * @property {number} end - The position where the URL ended in the string.
 * NOTE: It is possible that `link.end - link.start !== link.url.length`, namely for delimited URLs
 * @property {boolean} delimited - If the URL was delimited using < and > in the string
 */

/**
 * Trim characters out of an URL like Discord does to avoid sentence ponctuaction ending up being matched as a URL
 * @param {string} url The string to trim, doesn't need to truely be a valid URL
 * @returns {string} The trimmed string
 * @example
 * // Discord removes ponctuation at the end
 * trimURL('http://example.com/...'); // 'http://example.com/'
 * trimURL('http://example.org/.../thing'); // 'http://example.org/.../thing'
 *
 * // They also remove parenthesis except if they are part of the link
 * trimURL('http://example.com)'); // 'http://example.com'
 * trimURL('http://example.com/(link)'); // 'http://example.com/(link)'
 *
 * // The behavior can become kinda weird when mixing ponctuation and parenthesis
 * // But it is still how Discord handles it
 * trimURL('http://example.org/;;)...'); // 'http://example.org/;;'
 */
function trimURL(url) {
	const exclude = ['.', ',', ':', ';', '"', '\'', ']', ')'];
	let lastLetter;

	while (exclude.includes(lastLetter = url[url.length - 1])) {
		if (lastLetter === ')' && url.split('(').length >= url.split(')').length) {
			break;
		}

		url = url.substr(0, url.length - 1);

		if (lastLetter === ')') {
			break;
		}
	}

	return url;
}

/**
 * A link returned by matchURLs
 */
class Link {
	constructor(options) {
		/**
		 * The URL of the link, may not be http(s)
		 * @type {string}
		 */
		this.url = String(options.url);

		/**
		 * The index the URL started in the string
		 * @type {number}
		 */
		this.start = Number(options.start);

		/**
		 * The index the URL ended in the string
		 * Please note that in some cases, `link.end - link.start !== link.url.length`
		 * @type {number}
		 */
		this.end = Number(options.end);

		/**
		 * If the URl was delimited with < and >
		 * @type {boolean}
		 */
		this.delimited = Boolean(options.delimited);
	}
}

/**
 * Matches URLs in a string in the exact same way than Discord does
 * @param {string} content - The content to parse for URLs
 * @returns {url[]} The URLs matched
 */
function matchURLs(content) {
	// The first group of the regex contains the URL only if it is delimited, the second contains it if it is not
	const linkRegex = /(?:<([^ >]+:\/[^ >]+)>|(https?:\/\/[^\s<]{2,}))/g;
	const links = [];

	let match;
	while ((match = linkRegex.exec(content)) !== null) {
		const start = match.index;
		let url;
		let end;
		let delimited;

		if (match[1]) {
			delimited = true;
			url = match[1];
			end = start + match[0].length;
		} else if (match[2]) {
			delimited = false;
			url = trimURL(match[2]);
			end = start + url.length;
		}

		links.push(new Link({
			start,
			end,
			url,
			delimited
		}));
	}

	return links;
}

/**
 * Returns the codepoints representing a string, separated with hyphens
 * @param {String} character
 * @returns {String}
 */
function codepoints(character) {
	return [...character].map(char => char.codePointAt(0).toString(16)).join('-');
}

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

	const startIndex = message.content.indexOf(message.util.prefix) + message.util.prefix.length;
	const argsIndex = message.content.slice(startIndex).search(/\S/) + message.util.prefix.length;

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
	message: message => {
		const content = getArgs(message);

		const resolved = resolveLink(
			message.attachments,
			matchURLs(content),
			message.mentions
		);

		if (resolved) {
			return resolved;
		}

		if (regexCustomEmojis().test(content)) {
			const [, emojiName, emojiID] = regexCustomEmojis().exec(content);
			const emoji = message.client.emojis.get(emojiID);

			return {
				type: 'custom_emoji',
				url: `https://cdn.discordapp.com/emojis/${emojiID}.png`,
				source: emoji,
				name: `:${emojiName}: ${emoji || ''}`.trim()
			};
		}

		if (regexEmojis().test(content)) {
			const emoji = regexEmojis().exec(content)[0];

			return {
				type: 'emoji',
				url: `https://twemoji.maxcdn.com/2/svg/${codepoints(emoji)}.svg`,
				source: emoji,
				name: emoji
			};
		}

		if (
			message.guild &&
			message.guild.icon && (
				content.search(Discord.MessageMentions.EVERYONE_PATTERN) >= 0 ||
				content.toLowerCase().includes(message.guild.name.toLowerCase())
			)
		) {
			return resolveLink(message.guild);
		}

		const resolvedEmbeds = resolveLink(message.embeds);

		if (resolvedEmbeds) {
			return resolvedEmbeds;
		}

		// ^^^^ keyword
		if (/^\^+$/.test(content)) {
			const resolvedMessage = [...message.channel.messages.values()].reverse().find(message => {
				return message.embeds.some(embed => embed.image || embed.thumbnail);
			});

			if (resolvedMessage) {
				return resolveLink(resolvedMessage.embeds);
			}
		}
	}
};

function resolveLinkItem(item) {
	let link = {};

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

		default:
	}

	if (!link || !link.url) {
		return null;
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
 * @property {string} name - The internal name of the image, can be used for filenames and such
 */

/**
 * Find the relevant image in almost any objects from Discord.js that could possibly have an image associated to them.
 *
 * The main use for this function if to find the relevant image in a message.
 *
 * If multiple arguments are passed, the first one which can be resolved will be returned
 * @param {...*} items - the items to resolve, usually just a Discord Message
 * @returns {ResolvedLink} The resolved image
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

resolveLink.regexCustomEmojis = regexCustomEmojis;
resolveLink.trimURL = trimURL;
resolveLink.matchURLs = matchURLs;
resolveLink.codepoints = codepoints;
resolveLink.getArgs = getArgs;
resolveLink.humanizeURL = humanizeURL;

module.exports = resolveLink;
