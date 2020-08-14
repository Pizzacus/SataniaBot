const sleep = require('util').promisify(setTimeout);
const {Command} = require('discord-akairo');
const reg = require('../utils/reg');
const {sataniaName, extra} = require('../utils/regex-constants');

const sentences = [
	reg`(praise|just|love|(all\s*)?h(a|e)il)?\s*${sataniaName}`, // English
	reg`${sataniaName}\s*(praise|love|(all\s*)?h(a|e)il)?\s*`,
	reg`${sataniaName}\s*(the\s*)?best\s*((girl|debiru|devil|demon|(dai)?akuma)\s*)?`,
	reg`${sataniaName}${/(((のこと|の事)?(は|が)?((だい)?すき|大?好き|世界一|一番|かわいい|可愛い|最高)(だ|です)?)|を?褒めて(ください)?)?/}${/よ?ね?/}`, // Japanese
	reg`Слава\s*${sataniaName}`, // Russian
	reg`(Sauda(ç|c)(õ|o)es\s*a|a(ç|c)ai|salve|gloire?\s*(à|a)|(alaben|rezen|diosa)\s*a?)\s*${sataniaName}` // Portuguese, Spanish, and Italian
];

const options = {
	trigger: reg.i`^(${extra}${sentences}${extra})$`
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
		if (newMessage.id === message.id && !options.trigger.test(newMessage)) {
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
