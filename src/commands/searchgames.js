const {Command} = require('discord-akairo');
const Discord = require('discord.js');

const {
	ACTIVITY_TYPES,
	findGameType,
	searchGames
} = requireUtil('game-utils');

const MAX_RESULTS = 20;

const options = {
	aliases: ['searchgames', 'searchgame'],
	description:
		'Search among the games played on your server.\n__**Example:**__ `s!searchgames final fantasy`',
	args: [
		{
			id: 'query',
			match: 'content'
		}
	]
};

async function exec(message, {query}) {
	const embed = new Discord.RichEmbed();

	if (!message.guild) {
		return message.channel.send(
			'**Error:** This command must be used in a server.'
		);
	}

	if (query.length === 0) {
		return message.reply(
			'Please specify a game to look up.'
		);
	}

	const results = searchGames(query, message.guild.presences);

	embed.setTitle(`Games matching "${query}" on this server`);

	// Stop there is no games match
	if (results.length === 0) {
		embed.addField('\u2800', '*(none)*');
		return message.channel.send(embed);
	}

	embed.setDescription(
		results
			.map(
				game => `  • ${ACTIVITY_TYPES[findGameType(game.name, message.guild)]} **${game.name}** (${game.users.length.toLocaleString()} user${game.users.length > 1 ? 's' : ''})`
			)
			.slice(0, MAX_RESULTS)
			.join('\n')
	);

	if (results.length > MAX_RESULTS) {
		embed.description += `\n...and ${(results.length - MAX_RESULTS).toLocaleString()} more results`;
	}

	return message.channel.send(embed);
}

module.exports = new Command('searchgame', exec, options);
