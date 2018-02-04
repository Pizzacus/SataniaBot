const {URL, domainToUnicode} = require('url');
const Discord = require('discord.js');
const regexEmojis = require('emoji-regex');

const regexCustomEmojis = () => /<a?:(\w+):(\d+)>/g;

/**
 * Gets the URl to the static avatar of a user
 * @param {Discord.User|Discord.GuildMember} user - User to get the avatar of
 */
function staticAvatar(user) {
	if (user instanceof Discord.GuildMember) {
		user = user.user;
	}

	if (user instanceof Discord.User) {
		return user.avatar ?
			`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp` :
			user.defaultAvatarURL;
	}

	return null;
}

/**
 * @typedef {Object} url
 * @property {string} url - The URL matched, without the < and > if it was delimited
 * @property {number} start - The position where the URL started in the string
 * @property {number} end - The position where the URL ended in the string.
 * NOTE: It is possible that `link.end - link.start !== link.url.length`, namely for delimited URLs
 * @property {boolean} delimited - If the URL was delimited using < and > in the string
 */

/**
 * Matches URLs in a string in the exact same way than Discord does
 * @param {String} content - The content to parse for URLs
 * @returns {url[]} The URLs matched
 */
function matchURLs(content) {
	const baseRegex = /<?https?:\/\/[^\s>]+[^\s]/g;
	const exclude = ['.', ',', ':', ';', '"', '\'', ']', ')'];
	const links = [];

	let match;
	while ((match = baseRegex.exec(content)) !== null) {
		let start = match.index;
		let end;
		let url = match[0];
		let delimited;

		if (url.startsWith('<') && url.endsWith('>')) {
			end = start + url.length;
			url = url.substr(1, url.length - 2);
			delimited = true;
		} else {
			if (url.startsWith('<')) {
				url = url.substr(1);
				start += 1;
			}

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

			end = start + url.length;
			delimited = false;
		}

		links.push({
			start,
			end,
			url,
			delimited
		});
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

/**
 * @typedef {Object} ResolvedImage
 * @property {string} type - The type of item found
 * @property {string} url - The URL of the image
 * @property {*} [source] - Whatever object represents the source which was used to find the image, for instance, if this function resolves a mention, this property will be the corresponding user object
 * @property {string} name - The internal name of the image, can be used for filenames and such
 * @property {string} displayName - The displayable name, escaped for Discord Messages and makes use of Discord Formatting
 */

/**
 * Find the relevant image in almost any objects from Discord.js that could possibly have an image associated to them.
 *
 * The main use for this function if to find the relevant image in a message.
 *
 * If multiple arguments are passed, the first one which can be resolved will be returned
 * @param {...*} items - the items to resolve, usually just a Discord Message
 * @returns {ResolvedImage} The resolved image
 */
function relevantLink(...items) {
	const escape = Discord.Util.escapeMarkdown;

	if (items.length === 1 && items[0] instanceof Map) {
		items = [...items[0].values()];
	}

	if (items.length === 1 && Array.isArray(items[0])) {
		items = items[0];
	}

	if (items.length > 1) {
		let item;

		for (item of items) {
			item = relevantLink(item);
			if (item) {
				break;
			}
		}

		return item;
	}

	if (!items[0]) {
		return null;
	}

	const item = items[0];

	if (item instanceof Discord.Guild && item.icon) {
		return {
			type: 'guild',
			url: item.iconURL,
			source: item,
			name: item.name,
			displayName: escape(item.name)
		};
	}

	if (item instanceof Discord.GuildMember) {
		return {
			type: 'relevant',
			url: staticAvatar(item),
			source: item,
			name: item.user.username,
			displayName: escape(item.displayName)
		};
	}

	if (item instanceof Discord.User) {
		return {
			type: 'user',
			url: staticAvatar(item),
			source: item,
			name: item.username,
			displayName: escape(item.username)
		};
	}

	if (item instanceof Discord.MessageAttachment) {
		return {
			type: 'attachment',
			source: item,
			url: item.url,
			name: item.filename,
			displayName: escape(item.filename)
		};
	}

	if (item instanceof Discord.MessageEmbed) {
		let url;

		if (item.image) {
			url = item.image.url;
		} else if (item.thumbnail) {
			url = item.thumbnail.url;
		}

		if (url) {
			return {
				type: 'embed',
				source: item,
				url,
				name: url,
				displayName: escape(humanizeURL(url))
			};
		}
	}

	if (item instanceof Discord.MessageMentions) {
		if (item._content.includes('@everyone') || item._content.includes('@here')) {
			return relevantLink(item._guild, item.members, item.users);
		}

		return relevantLink(item.members, item.users);
	}

	if (item instanceof Discord.Message) {
		if (relevantLink(item.attachments)) {
			return relevantLink(item.attachments);
		}

		const content = getArgs(item);

		const links = matchURLs(content);

		if (links.length > 0) {
			return {
				type: 'url',
				source: item,
				url: links[0].url,
				name: links[0].url,
				displayName: escape(humanizeURL(links[0].url))
			};
		}

		if (relevantLink(item.mentions)) {
			return relevantLink(item.mentions);
		}

		if (regexCustomEmojis().test(content)) {
			const [, emojiName, emojiID] = regexCustomEmojis().exec(content);
			const emoji = item.client.emojis.get(emojiID);

			return {
				type: 'custom_emoji',
				url: `https://cdn.discordapp.com/emojis/${emojiID}.png`,
				source: emoji,
				name: emojiName,
				displayName: `:${Discord.Util.escapeMarkdown(emojiName)}: ${emoji || ''}`.trim()
			};
		}

		if (regexEmojis().test(content)) {
			const emoji = regexEmojis().exec(content)[0];

			return {
				type: 'emoji',
				url: `https://twemoji.maxcdn.com/2/svg/${codepoints(emoji)}.svg`,
				source: emoji,
				name: codepoints(emoji),
				displayName: emoji
			};
		}

		if (relevantLink(item.guild) && content.toLowerCase().replace(/\s/g, '').includes(item.guild.name.toLowerCase().replace(/\s/g, ''))) {
			return relevantLink(item.guild);
		}

		if (relevantLink(item.embeds)) {
			return relevantLink(item.embeds);
		}

		// ^^^^ keyword
		if (/^\^+$/.test(content)) {
			const message = [...item.channel.messages.values()].reverse().find(message => {
				return message.attachments.size > 0 || message.embeds.some(embed => {
					return embed.image || embed.thumbnail;
				});
			});

			if (message) {
				return relevantLink(message.attachments, message.embeds);
			}
		}
	}
}

relevantLink.regexCustomEmojis = regexCustomEmojis;
relevantLink.staticAvatar = staticAvatar;
relevantLink.matchURLs = matchURLs;
relevantLink.codepoints = codepoints;
relevantLink.getArgs = getArgs;
relevantLink.humanizeURL = humanizeURL;

module.exports = relevantLink;
