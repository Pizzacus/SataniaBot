const {Command} = require('discord-akairo');

const nick = requireUtil('nick');

const options = {
	aliases: ['duel'],
	args: [{
		id: 'user',
		type: 'relevant',
		match: 'content'
	}],
	description: 'For fixing problems like real cowboys! One of you will win, the other will die, good luck!\n__**Examples:**__: `s!duel @Example#1234`'
};

const winstreak = {};

async function exec(message, args) {
	const sleep = require('util').promisify(setTimeout);
	const {channel} = message;

	if (args.user) {
		if (message.author.id === args.user.id) {
			await message.channel.send(`**${nick(message.author, channel)}** successfully killed themselves with a bullet in their head 😂🔫`);
			return;
		}

		let duelers = [message.author, args.user];

		let duel = await message.channel.send(`**${nick(duelers[0], channel)}** and **${nick(duelers[1], channel)}** start a duel...`);

		await sleep(1250);

		duel = await duel.edit(duel.content + ' Ready...');
		await sleep(1000);

		duel = await duel.edit(duel.content + ' **FIRE!**');
		await sleep(1500);

		if (Math.random() > 0.5) {
			duelers = duelers.reverse();
		}

		const [winner, loser] = duelers;

		winstreak[winner.id] = winstreak[winner.id] + 1 || 1;
		winstreak[loser.id] = 0;

		duel = await duel.edit(duel.content + `\n\n**${nick(winner, channel)} won the duel** and killed **${nick(loser, channel)}**!`);
		await sleep(1500);

		await duel.edit(duel.content + ` \`Winstreak: ${winstreak[winner.id]}\``);
	}
}

module.exports = new Command('duel', exec, options);
