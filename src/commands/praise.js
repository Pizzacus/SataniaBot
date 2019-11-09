const sleep = require('util').promisify(setTimeout);
const {Command} = require('discord-akairo');

const praiseRegex = /^(Слава|praise|just|love?|(all )?h(a|e)il|Sauda(ç|c)(õ|o)es a|a(ç|c)ai|salve|gloire? (à|a)|(alaben|rezen|diosa) a?)?\s*(kurumizawa\s*)?(satan(i|y|ichi)a|Сатании)\s*-?(sama|san|chan|senpai)?\s*(McDowellu?\s*)?((the\s*)?best\s*)?(!+|\?+)?$/i;

const options = {
	trigger: praiseRegex
};

async function exec(message) {
	let abortReacts = false;
	const reacts = [
		'\uD83C\uDDF5', // P
		'\uD83C\uDDF7', // R
		'\uD83C\uDDE6', // A
		'\uD83C\uDDEE', // I
		'\uD83C\uDDF8', // S
		'\uD83C\uDDEA' // E
	];

	if (message.client.guilds.has('310180409541394432')) {
		reacts.push(
			message.client.guilds.get('310180409541394432').emojis
				.filter(value =>
					value.name.replace(/^gif/, '').startsWith('Satania')
				)
				.random()
		);
	}

	function handleEdit(oldMessage, newMessage) {
		if (newMessage.id === message.id && !praiseRegex.test(newMessage)) {
			abortReacts = true;
			message.clearReactions();
		} else if (!abortReacts) {
			message.client.once('messageUpdate', handleEdit);
		}
	}

	message.client.once('messageUpdate', handleEdit);

	for (let i = 0; i < reacts.length; i++) {
		if (!abortReacts) {
			await message.react(reacts[i]);
			await sleep(300);
		}
	}

	abortReacts = true;
}

module.exports = new Command('praise', exec, options);
