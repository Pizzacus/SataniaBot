const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Converts a string to camelcase
 * @param {string} string
 * @returns {string}
 */
function camelCase(string) {
	return string.replace(/(?:-|_)([a-z])/g, match => match[1].toUpperCase());
}

/**
 * Turns all keys in an object from snake_case or hyphen-case to camelCase.
 * It will also transform the keys of objects in the object.
 * It does understand recursion and will process objects in arrays too.
 * @param {Object} obj The object to turn into camelcase
 * @returns {Object} Another object where all the keys are camelCase
 */
function camelCaseKeys(obj, seen = new WeakMap()) {
	const isObject = x =>
		typeof x === 'object' &&
		x !== null &&
		!(x instanceof RegExp) &&
		!(x instanceof Error) &&
		!(x instanceof Date);

	if (!isObject(obj)) {
		return obj;
	}

	const target = {};

	if (seen.has(obj)) {
		return seen.get(obj);
	}

	seen.set(obj, target);

	for (const key of Object.keys(obj)) {
		let value = obj[key];

		if (Array.isArray(value)) {
			value = value.map(elem => camelCaseKeys(elem, seen));
		} else if (isObject(value)) {
			value = camelCaseKeys(value, seen);
		}

		target[camelCase(key)] = value;
	}

	return target;
}

const config = camelCaseKeys(yaml.safeLoad(fs.readFileSync('./config.yml')));

if (config.token === '################') {
	console.log('ERROR: Please set your token in config.yml');
	process.exit(1);
}

if (Array.isArray(config.owner) && config.owner.length === 1 && config.owner[0] === '################') {
	console.warn('WARNING: You should set the ID of the bot owner in config.yml');
}

if (!config.download) {
	config.download = {};
}

Object.freeze(config);

module.exports = config;
