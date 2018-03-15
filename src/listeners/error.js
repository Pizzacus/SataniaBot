const util = require('util');
const fs = require('fs');
const path = require('path');
const {Listener} = require('discord-akairo');
const Discord = require('discord.js');

const options = {
	emitter: 'commandHandler',
	eventName: 'error'
};

const userErrors = {
	FetchError: {
		'[prefix]': 'An error occured while fetching data',
		'[default]': 'Unknown Error',

		ENOTFOUND: 'This adress doesn\'t seem to exist',
		EAI_AGAIN: 'A network error occured',
		ECONNRESET: 'A network error occured',
		ETIMEDOUT: 'A network error occured',

		'invalid-json': 'The server returned an unexpected response',
		'max-redirect': 'Too many redirections occured',
		'no-redirect': 'An unexpected redirection occured',
		'invalid-redirect': 'An invalid redirection occured',
		'request-timeout': 'The server took too long to reply so the request was aborted',
		'body-timeout': 'Downloading the data took too long so the request was aborted',
		'max-size': 'The response exceeded the maximal allowed size',
		'not-ok': err => `The server returned an **error ${err.status}**`
	},
	DiscordAPIError: {
		'[prefix]': 'An error occured while performing an action',
		'[default]': err => err.message,

		50013: 'I do not have permission to do this, please ask the moderators of this server to give me the appropriate permissions'
	},

	'[prefix]': 'Error',

	EAI_AGAIN: 'A network error occured',
	ECONNRESET: 'A network error occured',
	ETIMEDOUT: 'A network error occured',
	render: 'The image cannot be processed, it may be invalid or of an unsupported format!'
};

function findErrorMessage(err, messages) {
	const has = requireUtil('has-attr');

	const errName = err.code || err.type || err.name || err.message;
	const errClass = err.constructor.name;
	let classMessage;

	if (has(messages, errClass) && typeof messages[errClass] === 'object') {
		classMessage = findErrorMessage(err, messages[errClass]);
	}

	let prefix;

	if (has(messages, '[prefix]')) {
		prefix = `**${messages['[prefix]']}**: `;
	} else {
		prefix = '';
	}

	let errDetails;

	if (has(messages, errName)) {
		errDetails = messages[errName];
	} else if (has(messages, '[default]')) {
		errDetails = messages['[default]'];
		console.error('An error was not present in the message object:');
		console.error(err);
	}

	let errMessage;

	if (errDetails) {
		if (typeof errDetails === 'function') {
			errDetails = errDetails(err);
		}
		errMessage = prefix + errDetails;
	}

	return classMessage || errMessage;
}

function formatDate(date) {
	let day = [
		date.getUTCFullYear(),
		date.getUTCMonth() + 1,
		date.getUTCDate()
	];

	let time = [
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds()
	];

	day = day
		.map(val => val.toString().padStart(2, '0'))
		.join('-');

	time = time
		.map(val => val.toString().padStart(2, '0'))
		.join('.');

	return `${day} ${time}`;
}

function handleOperationalError(err, message) {
	const writeFile = util.promisify(fs.writeFile);
	const now = new Date();
	const logFile = `Error ${formatDate(now)}`;
	const logDir = './data/error-logs';

	let perms;

	if (message.channel instanceof Discord.GuildChannel) {
		perms = message.channel.permissionsFor(message.client.user);
	} else {
		perms = new Discord.Permissions(67501120);
	}

	let response;

	console.error(err);

	if (perms.has(['SEND_MESSAGES', 'EMBED_LINKS'])) {
		const embed = new Discord.RichEmbed();

		embed
			.setTitle('An unexpected error has occured!')
			.setDescription(String(err))
			.setColor('#e42f1b')
			.setTimestamp(now)
			.setFooter(err.code ? `Error Code: ${err.code}` : '');

		response = message.channel.send(embed);
	} else if (perms.has('SEND_MESSAGES')) {
		let text = `**An unexpected error has occured!**\n${err}`;

		if (err.code) {
			text += ` Error Code: ${err.code}`;
		}

		response = message.channel.send(text);
	}

	return Promise.all([
		response,
		new Promise(resolve => {
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir);
			}

			resolve(
				Promise.all([
					writeFile(
						path.join(logDir, `${logFile}.txt`),
						util.inspect(err)
					),
					writeFile(
						path.join(logDir, `Message ${logFile}.txt`),
						util.inspect(message)
					)
				])
			);
		})
	]).then(returned => returned[0]);
}

function exec(err, message) {
	const errMessage = findErrorMessage(err, userErrors);
	const shouldReply =
		message.channel.type !== 'text' ||
		message.channel.permissionsFor(message.client.user).has('SEND_MESSAGES');

	if (errMessage && shouldReply) {
		return message.channel.send(errMessage);
	}

	return handleOperationalError(err, message);
}

module.exports = new Listener('error', exec, options);
