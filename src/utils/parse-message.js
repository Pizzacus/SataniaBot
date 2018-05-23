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
 * Matches Links in a string in the exact same way than Discord does
 * @param {string} content The content to parse for Links
 * @returns {Link[]} The Links matched
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

		links.push(
			new Link({
				start,
				end,
				url,
				delimited
			})
		);
	}

	return links;
}

/**
 * Represents a Discord emoji, custom or native
 */
class Emoji {
	constructor(options) {
		/**
		 * The name of the emoji, corresponds to the emoji itself when native
		 * @type {string}
		 */
		this.name = String(options.name);

		/**
		 * Whether the Emoji is a custom guild emoji or not
		 * @type {boolean}
		 */
		this.custom = Boolean(options.custom);

		if (options.from) {
			/**
			 * The string where the emoji was matched
			 * @type {?string}
			 */
			this.from = String(options.from);

			/**
			 * The index at which the Emoji started in the original string
			 * @type {?number}
			 */
			this.start = Number(options.start);

			/**
			 * The index at which the Emoji ended in the original string
			 * @type {?number}
			 */
			this.end = Number(options.end);
		}

		if (this.custom) {
			/**
			 * The ID of the Emoji, only for custom Emojis
			 * @type {?string}
			 */
			this.id = String(options.id);

			/**
			 * Whether the emoji is animated, only for custom Emojis
			 * @type {?boolean}
			 */
			this.animated = Boolean(options.animated);
		}
	}

	/**
	 * The codepoints of the emoji, null for custom Emojis
	 * @type {?string}
	 */
	get codepoints() {
		if (this.custom) {
			return null;
		}

		return [...this.name]
			.map(char => char.codePointAt(0).toString(16))
			.join('-');
	}

	/**
	 * The URL to the custom emoji.
	 *
	 * Native Emojis lead to a SVG image on twemoji.maxcdn.com.
	 *
	 * Custom Emojis lead to a PNG or GIF image on cdn.discordapp.com.
	 * @type {string}
	 */
	get url() {
		if (this.custom && this.animated) {
			return `https://cdn.discordapp.com/emojis/${this.id}.gif`;
		}

		return this.staticURL;
	}

	/**
	 * The URL to the custom emoji, **static only**.
	 *
	 * Native Emojis lead to a SVG image on twemoji.maxcdn.com.
	 *
	 * Custom Emojis lead to a PNG image on cdn.discordapp.com.
	 * @type {string}
	 */
	get staticURL() {
		if (this.custom) {
			return `https://cdn.discordapp.com/emojis/${this.id}.png`;
		}

		return `https://twemoji.maxcdn.com/2/svg/${this.codepoints}.svg`;
	}

	/**
	 * Returns a textual representation of the emoji for use in messages
	 * @returns {string} The textual representation of the emoji
	 */
	toString() {
		if (this.custom) {
			return `<:${this.name}:${this.id}>`;
		}

		return this.name;
	}
}

/**
 * Matches Emojis in a string, both custom and native.
 * @param {string} content The content to parse for emojis
 * @returns {Emoji[]} The emojis matched
 */
function matchEmojis(content) {
	const emojiRegex = requireUtil('emoji-regex')();

	const customRegex = /<(a?):(\w+):(\d+)>/g;
	const emojis = [];

	let match;
	while ((match = customRegex.exec(content)) !== null) {
		const [, animated, name, id] = match;
		const emoji = new Emoji({
			from: content,
			custom: true,
			animated,
			name,
			id,
			start: match.index,
			end: match.index + match[0].length
		});

		emojis.push(emoji);
	}

	while ((match = emojiRegex.exec(content)) !== null) {
		const [name] = match;
		const emoji = new Emoji({
			from: content,
			custom: false,
			name,
			start: match.index,
			end: match.index + match[0].length
		});

		emojis.push(emoji);
	}

	emojis.sort((a, b) => a.start - b.start);
	return emojis;
}

module.exports = {
	matchURLs,
	matchEmojis,
	Link,
	Emoji
};
