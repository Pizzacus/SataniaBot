const sleep = require('util').promisify(setTimeout);
const {Command} = require('discord-akairo');
const reg = require('../utils/reg');
const {sataniaName, extra} = require('../utils/regex-constants');

const happyBirthday = /happy\s*(birthday|bday|day\s*of\s*(the)?\s*birth)/;
const tanjoubiOmedetou = /(お?(たんじょうび|誕生日)おめでとう(ございます|です)?)/;
const frenchBirthday = /(joyeu(x|se)?|bon(ne)?)\s*(ann?iv(erss?aire?)?|f[êe]te)s?/;
const spanishBirthday = /feliz\s*(cumplea[ñn]os|cumple)/;
const portugueseBirthday = /(feliz\s*anivers[áa]rio)|Parab[ée]ns/;

const sentences = [
	reg`${happyBirthday},?\s*${sataniaName}`, // English
	reg`${sataniaName},?\s*${happyBirthday}`,
	reg`${sataniaName}、?${tanjoubiOmedetou}${/よ?ね?/}`, // Japanese
	reg`${tanjoubiOmedetou}、?${sataniaName}`,
	reg`${spanishBirthday},?${sataniaName}`, // Spanish
	reg`${sataniaName},?${spanishBirthday}`,
	reg`${frenchBirthday},?\s*${sataniaName}`, // French
	reg`${sataniaName},?\s*${frenchBirthday}`,
	reg`${portugueseBirthday},?\s*${sataniaName}`, // Portuguese
	reg`${sataniaName},?\s*${portugueseBirthday}`
];

const options = {
	trigger: reg.i`^(${extra}${sentences}${extra})$`
};

async function exec(message) {
	const now = new Date();

	if (now.getUTCMonth() === 7) {
		const day = now.getUTCDate();
		if (day < 14 || day > 17) {
			return;
		}
	} else {
		return;
	}

	let abortReacts = false;
	const reacts = [
		'🎉',
		'🎂'
	];

	if (message.client.guilds.has('310180409541394432')) {
		reacts.unshift(message.client.guilds.get('310180409541394432').emojis.get('380082357904080906'));
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

module.exports = new Command('bday', exec, options);
