const Discord = require('discord.js');

const ACTIVITY_TYPES = ['Playing', 'Streaming', 'Listening to', 'Watching', ''];

/**
 * Converts roman numbers to actual numbers
 * Return NaN if not a valid roman number
 * @param {string} str The number to convert
 * @returns {number} The converted number
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
 * @returns {string} The normalized string
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
 * @returns {number} The number representing the most common game type
 */
function findGameType(gameName, guild) {
	const types = {};
	for (const [, {game}] of guild.presences) {
		if (!game || (game.name !== gameName && game.state !== gameName)) {
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
 * Categorizes a collection where the keys are ID and the values are presences
 * Into another collection where the keys are the game name and the values are arrays of IDs
 * @param {Map<Snowflake, Discord.Presence>} presences The collection to cathegorize
 * @returns {Discord.Collection<string, Snowflake[]>} The categorized collection
 */
function listGames(presences) {
	const games = new Discord.Collection();

	function add(name, id) {
		if (!games.has(name)) {
			games.set(name, []);
		}

		games.get(name).push(id);
	}

	for (const [id, {game}] of presences) {
		if (!game) {
			continue;
		}

		add(game.name, id);
		add(game.state, id);
	}

	return games;
}

/**
 * Searches a game within a collection of presences
 * @param {string} query The query to search for
 * @param {Collection} presences The collection of presences to search in
 * @returns {Object[]} An array of objects with "name", "users", and "score" keys
 */
function searchGames(query, presences) {
	const games = listGames(presences);

	const gameScores = games
		.map((users, name) => {
			const score = resultScore(name, query);

			return {
				name,
				users,
				score
			};
		})
		.filter(game => isFinite(game.score));

	gameScores.sort((a, b) => a.score - b.score);

	return gameScores;
}

module.exports = {
	ACTIVITY_TYPES,
	roman,
	normalizeQuery,
	resultScore,
	findGameType,
	listGames,
	searchGames
};
