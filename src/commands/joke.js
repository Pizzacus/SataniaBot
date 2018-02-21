const {Command} = require('discord-akairo');

const fetchDefaults = requireUtil('fetch-defaults');
fetchDefaults.headers.Accept = 'application/json';

const fetch = require('make-fetch-happen').defaults(fetchDefaults);

const options = {
	aliases: ['joke', 'jokes', 'dadjoke'],
	description: 'Get a random joke, pretty generic comand'
};

function getJoke() {
	return fetch('https://icanhazdadjoke.com/')
		.then(res => {
			if (!res.status >= 200 && res.status < 400) {
				const err = new fetch.FetchError('Status was not ok, it was ' + res.status, 'not-ok');
				err.status = res.status;

				throw err;
			}

			return res.json();
		});
}

async function exec(message) {
	const res = await getJoke();
	const link = `[[link]](https://icanhazdadjoke.com/j/${res.id})`;

	return message.channel.send({
		embed: {
			// That's an en space, it's a bit wider than a regular space
			description: res.joke + '\u2002' + link,
			footer: {
				text: 'Powered by icanhazdadjoke.com',
				// eslint-disable-next-line camelcase
				icon_url: 'https://icanhazdadjoke.com/static/favicon-32x32.png'
			}
		}
	});
}

module.exports = new Command('joke', exec, options);
