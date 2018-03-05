const {Command} = require('discord-akairo');
const Discord = require('discord.js');

const MIN_FIELD_LINES = 5;
const MAX_EMBED_FIELDS = 25;
const MAX_EMBED_LENGTH = 5750;
const ACTIVITY_TYPES = ['Playing', 'Streaming', 'Listening to', 'Watching'];

const options = {
	aliases: ['whosplaying', 'playing', 'whoplaying', 'whoplays'],
	description:
		'Find out who is playing a certain game, the game you are currently playing will be used by default.\n__**Example:**__ `s!whosplaying osu!`',
	args: [
		{
			id: 'query',
			match: 'content'
		}
	]
};

/**
 * Converts roman numbers to actual numbers
 * Return NaN if not a valid roman number
 * @param {string} str The number to convert
 * @returns {number}
 */
function roman(str) {
	let result = 0;

	str = str.toUpperCase();

	const decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
	const roman = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
	for (let i = 0; i <= decimal.length; i++) {
		while (str.startsWith(roman[i])) {
			result += decimal[i];
			str = str.replace(roman[i], '');
		}
	}

	if (str.length !== 0) {
		return NaN;
	}

	return result || NaN;
}

/**
 * Normalizes queries and results
 * By making everything lowercase, normalizing spaces
 * And removing non latin, numeral or spaces characters
 * Except if it detects it shouldn't
 * @param {string} string The string to normalize
 * @return The normalized string
 */
function normalizeQuery(string) {
	let normalized = String(string).toLowerCase().replace(/[\s\-_]+/g, ' ');

	normalized = normalized
		.split(/\s/g)
		.map(word => {
			const number = roman(word);

			if (number) {
				return number.toString(10);
			}

			return word;
		})
		.join(' ');

	const latinOnly = normalized.replace(/[^a-z0-9\s]/g, '');

	// The latinOnly version will not be returned
	// If it is empty of if over 65% of the original characters were removed
	if (latinOnly.length === 0 || latinOnly.length / normalized.length < 0.35) {
		return normalized;
	}

	return latinOnly;
}

/**
 * Returns the score of a result based on a query
 * Scores are on an inverted scale (lower = better)
 * And they are always superior and not equal to zero
 * @param {string} result The result
 * @param {string} query The query to compare to the result
 * @returns {number} The score of the result, Infinity if they dont match at all
 */
function resultScore(result, query) {
	let score;
	query = normalizeQuery(query);
	result = normalizeQuery(result);

	if (!result || !result.includes(query)) {
		return Infinity;
	}

	score = result.length - query.length + 1;

	if (result.startsWith(query)) {
		// Breaks ties if the result starts with the query
		score -= 0.5;
	}

	return score;
}

/**
 * Find the most common game type for a game name in a guild
 * @param {string} gameName The game name to find the common type of
 * @param {Discord.Guild} guild The guild to search in
 */
function findGameType(gameName, guild) {
	const types = {};
	for (const [, {game}] of guild.presences) {
		if (!game || game.name !== gameName) {
			continue;
		}

		if (!(game.type in types)) {
			types[game.type] = 0;
		}

		types[game.type]++;
	}

	const sortedTypes = Object.entries(types).sort((a, b) => a[1] - b[1]);
	return sortedTypes[0][0];
}

/**
 * Sorts a collection where the keys are ID and the values are presences
 * Into another collection where the keys are the game name and the values are arrays of IDs
 * @param {Discord.Collection<Snowflake, Discord.Presence>} games
 * @returns {Discord.Collection<string, Snowflake[]}
 */
function listGames(presences) {
	const games = new Discord.Collection();

	for (const [id, {game}] of presences) {
		if (!game) {
			continue;
		}

		if (!games.has(game.name)) {
			games.set(game.name, []);
		}

		games.get(game.name).push(id);
	}

	return games;
}

async function exec(message, {query}) {
	// The embed which will be fullfilled and then sent
	const embed = new Discord.RichEmbed();

	// Logic when the user does not specify a query
	// Sets the query to the user's playing status
	// Or ask the user to specify a query if they aren't playing anything
	if (query.length === 0) {
		const member = message.guild.member(message.author);

		if (!member.presence.game) {
			return message.reply(
				'Please specify a game to look up, or start playing a game to find out who else is playing it!'
			);
		}

		embed.setFooter(
			'Since you did not specify a game to look up, the game you were currently playing was used instead.'
		);

		query = member.presence.game.name;
	}

	const games = listGames(message.guild.presences);

	let numberOfResults = 0;

	// Finds the most relevant result
	// By looping over every value
	// And passing the result to the next loop if it is more relevant
	// Or just keepng the previous value if it isn't
	const gameName = games.reduce((acc, users, gameName) => {
		const valueScore = resultScore(gameName, query);
		const accScore = resultScore(acc, query);

		if (isFinite(valueScore)) {
			numberOfResults++;
		}

		return accScore > valueScore ? gameName : acc;
	}, null);

	// Stop there is no games match
	if (!gameName) {
		embed.setTitle(`Playing ${query}`);
		embed.addField('\u2800', '*(no one)*');
		return message.channel.send(embed);
	}

	const lines = games.get(gameName).map(id => `• <@${id}>`);
	const linesPerEmbed = Math.max(
		Math.ceil(lines.length / MAX_EMBED_FIELDS),
		MIN_FIELD_LINES
	);

	const gameType = findGameType(gameName, message.guild);

	embed.setTitle(
		`${ACTIVITY_TYPES[gameType]} ${gameName}` +
		` (${lines.length} ${lines.length > 1 ? 'users' : 'user'})`
	);

	// Stores the total length of the embed
	// To avoid reaching the limit of 6000 characters
	let totalLength = embed.title.length;

	while (lines.length > 0) {
		const description = lines.splice(0, linesPerEmbed).join('\n');

		// Add the description length and 16 (for the title) to the total length
		totalLength += description.length + 16;

		if (totalLength > MAX_EMBED_LENGTH) {
			embed.setDescription(
				'**Note**: Some results were omitted because there were too many of them.'
			);
			break;
		}

		embed.addField('\u2800', description, true);
	}

	if (!embed.footer && numberOfResults > 1) {
		embed.setFooter(
			`${numberOfResults - 1} other ${numberOfResults > 2 ? 'games' : 'game'} matched your query. ` +
			// Use non-breaking spaces to make a nice linebreak after "query"
			`This game is displayed because it seems to be the most relevant.`.replace(/\s/g, '\u00A0\u00A0')
		);
	}

	return message.channel.send(embed);
}

module.exports = new Command('playing', exec, options);
