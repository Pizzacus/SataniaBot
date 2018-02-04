const {Command} = require('discord-akairo');

const options = {
	aliases: ['duel'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	// TODO: Make s!duel work in DMs
	channelRestriction: 'guild',
	description: 'For fixing problems like real cowboys! One of you will win, the other will die, good luck!\n__**Examples:**__: `s!duel @Example#1234`'
};

const winstreak = {};

async function exec(message, args) {
	const sleep = require('util').promisify(setTimeout);

	if (args.user) {
		if (message.author.equals(args.user.user)) {
			await message.channel.send(`**${message.guild.member(message.author).displayName}** successfully killed themselves with a bullet in their head 😂🔫`);
			return;
		}

		let duelers = [message.guild.member(message.author), message.guild.member(args.user)];

		let duel = await message.channel.send(`**${duelers[0].displayName}** and **${duelers[1].displayName}** start a duel...`);

		await sleep(1250);

		duel = await duel.edit(duel.content + ' Ready...');
		await sleep(1000);

		duel = await duel.edit(duel.content + ' **FIRE!**');
		await sleep(1500);

		if (Math.round(Math.random())) {
			duelers = duelers.reverse();
		}

		const [winner, loser] = duelers;

		winstreak[winner.id] = winstreak[winner.id] + 1 || 1;
		winstreak[loser.id] = 0;

		duel = await duel.edit(duel.content + `\n\n**${winner.displayName} won the duel** and killed **${loser.displayName}**!`);
		await sleep(1500);

		await duel.edit(duel.content + ` \`Winstreak: ${winstreak[winner.id]}\``);
	}
}

module.exports = new Command('duel', exec, options);
