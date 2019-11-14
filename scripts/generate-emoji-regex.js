/**
 * "generate-emoji-regex.js"
 * Fetches the list of emojis in the currrent version of twemojis
 * And generate a regex based on that as a module in `src/utils/emoji-regex.js`
 */

// ------------------

const writeFile = require('util').promisify(require('fs').writeFile);
const fetch = require('make-fetch-happen');

let Trie;

try {
	Trie = require('regexgen').Trie;
} catch (error) {
	if (error.code === 'MODULE_NOT_FOUND') {
		console.error(
			'\nThe module \'regexgen\' could not be found\n' +
			'It is part of the Dev Dependancies, please install those to run this script\n'
		);
	}

	throw error;
}

/**
 * Parses a Twemoji filename and returns the corresponding emoji
 * @param {string} filename The filename to parse
 * @returns {string} The corresponding emoji
 */
function parseFilename(filename) {
	const codepoints = filename
		.match(/[0-9a-f]+/g)
		.map(str => parseInt(str, 16));

	return String.fromCodePoint(...codepoints);
}

console.log('Generating the Regex...');
console.log('1. Fetch the hash of the Twemoji SVG emoji folder');

fetch('https://api.github.com/repos/twitter/twemoji/contents/assets')
	.then(res => res.json())
	.then(res => {
		const dir = res.find(dir => dir.name === 'svg');

		if (!dir) {
			throw new Error('Directory could not be found');
		}

		const hash = dir.sha;

		console.log(`Hash: ${hash}\n`);
		console.log('2. Fetch the list of files in the folder');

		return hash;
	})
	.then(hash => fetch('https://api.github.com/repos/twitter/twemoji/git/trees/' + hash))
	.then(res => res.json())
	.then(res => {
		if (res.truncated === true) {
			throw new Error('Directory content was truncated');
		}

		console.log(`${res.tree.length} emojis listed\n`);
		console.log('3. Generate the regex and dump it to the file');

		const set = new Trie();

		for (const {path: filename} of res.tree) {
			if (!filename.endsWith('.svg')) {
				continue;
			}

			const emoji = parseFilename(filename);

			if (emoji) {
				set.add(emoji);
			}
		}

		const content =
`// This file was generated with 'script/generate-emoji-regex.js' automatically
// It is a regex to match every emoji supported by twemoji
// They actually support things that aren't considered as emojis
// So a specific regex is needed
// Just run 'script/generate-emoji-regex' to update this file

module.exports = () => {
	return /${set.toString('u')}/gu;
};

module.exports.noGlobalFlag = /${set.toString('u')}/u;

`;

		return writeFile('./src/utils/emoji-regex.js', content);
	})
	.then(() => console.log('Done!'))
	.catch(console.error);
