
function isIterator(val) {
	return val != null && typeof val[Symbol.iterator] === 'function';
}

module.exports = new Proxy(function (strings, ...keys) {
	let flags = '';

	if (typeof strings === 'string') {
		flags = strings;
		strings = keys.shift();
	}

	function processTemplate(strings, ...keys) {
		const REGEX_ESCAPES = /[\\^$.*+?()[\]{}|]/g;

		let regex = '';

		for (const i of strings.raw.keys()) {
			regex += strings.raw[i];

			if (keys.length > i) {
				const key = keys[i];
				if (key instanceof RegExp) {
					regex += `(?:${keys[i].source})`;
				} else if (key instanceof String) {
					regex += String(key)
						.replace(REGEX_ESCAPES, '\\$&');
				} else if (isIterator(key)) {
					const str = [...key].map(val => val.source).join('|');
					regex += `(?:${str})`;
				}
			}
		}

		return new RegExp(regex, flags);
	}

	if (Array.isArray(strings)) {
		return processTemplate(strings, ...keys);
	}

	return processTemplate;
}, {
	get: (obj, key) => {
		if (typeof key === 'string' && /^[gimuys]+$/.test(key)) {
			return obj(key);
		}

		return obj[key];
	}
});
