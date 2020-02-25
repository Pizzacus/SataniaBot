const {Command} = require('discord-akairo');
const Discord = require('discord.js');

const {
	ACTIVITY_TYPES,
	findGameType,
	listGames,
	searchGames
} = requireUtil('game-utils');

const MIN_FIELD_LINES = 5;
const MAX_EMBED_FIELDS = 25;
const MAX_EMBED_LENGTH = 5750;

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

async function exec(message, {query}) {
	// The embed which will be fullfilled and then sent
	const embed = new Discord.RichEmbed();

	if (!message.guild) {
		return message.channel.send(
			'**Error:** This command must be used in a server.'
		);
	}

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

	const results = searchGames(query, message.guild.presences);

	// Stop there is no games match
	if (results.length === 0) {
		embed.setTitle(`Playing ${query}`);
		embed.addField('\u2800', '*(no one)*');
		return message.channel.send(embed);
	}

	const gameName = results[0].name;

	let lines;

	if (message.guild.large) {
		await message.guild.fetchMembers();
		lines = games.get(gameName).map(id => `• ${message.client.users.get(id).tag}`);
	} else {
		lines = games.get(gameName).map(id => `• <@${id}>`);
	}

	lines = lines.slice(0, 100);

	const linesPerEmbed = Math.max(
		Math.ceil(lines.length / MAX_EMBED_FIELDS),
		MIN_FIELD_LINES
	);

	const gameType = findGameType(gameName, message.guild);

	embed.setTitle(
		`${ACTIVITY_TYPES[gameType] || ''} ${gameName}` +
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

	if (embed.fields.length > 3 && embed.fields.length % 3 === 2) {
		// Adds an empty field to align things properly
		// when there are two remaining fields at the end
		embed.addBlankField(true);
	}

	if (!embed.footer && results.length > 1) {
		embed.setFooter(
			`${results.length - 1} other ${results.length > 2 ? 'games' : 'game'} matched your query. Use "s!searchgames ${query}" to see them!`
		);
	}

	return message.channel.send(embed);
}

module.exports = new Command('playing', exec, options);
