const sleep = require('util').promisify(setTimeout);
const {Command} = require('discord-akairo');
const reg = require('../utils/reg');
const {sataniaName, extra} = require('../utils/regex-constants');

const happyBirthday = /happy (birthday|bday|day of the birth)/;
const tanjoubiOmedetou = /(お?(たんじょうび|誕生日)おめでとう(ございます|です)?)/;
const frenchBirthday = /(joyeu(x|se)?|bon(ne)?)\s*(ann?iv(erss?aire?)?|f[êe]te)s?/;
const spanishBirthday = /feliz\s*cumpleaños/;
const portugueseBirthday = /(feliz\s*anivers[áa]rio)|Parab[ée]ns/;

const languages = {
	english: [
		reg`${happyBirthday},?\s*${sataniaName}`,
		reg`${sataniaName},?\s*${happyBirthday}`
	],
	japanese: [
		reg`${sataniaName}、?${tanjoubiOmedetou}${/よ?ね?/}`,
		reg`${tanjoubiOmedetou}$、?${sataniaName}`
	],
	spanish: [
		reg`${spanishBirthday},?${sataniaName}`,
		reg`${sataniaName},?${spanishBirthday}`
	],
	french: [
		reg`${frenchBirthday},?\s*${sataniaName}`,
		reg`${sataniaName},?\s*${frenchBirthday}`
	],
	portuguese: [
		reg`${portugueseBirthday},?\s*${sataniaName}`,
		reg`${sataniaName},?\s*${portugueseBirthday}`
	]
};

const allSentences = Object.values(languages).reduce((collected, current) => [...collected, ...current], []);
const options = {
	trigger: reg.i`^(${extra}${allSentences}${extra})$`
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
