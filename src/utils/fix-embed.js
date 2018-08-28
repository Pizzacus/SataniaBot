function fixField(field) {
	if (typeof field === 'string') {
		field = field
			.replace(/\t/g, '    ')
			.replace(/ /g, '\u2005'); // FOUR-PER-EM space, looks identical to a space, but doesn't collapse!
	}

	return field;
}

function has(obj, ...properties) {
	for (const prop of properties) {
		if (
			obj == null ||
			!Reflect.apply(Object.prototype.hasOwnProperty, obj, [prop])
		) {
			return false;
		}

		obj = obj[prop];
	}

	return true;
}

module.exports = embed => {
	if (embed != null) {
		if (has(embed, 'description')) {
			embed.description = fixField(embed.description);
		}

		if (has(embed, 'title')) {
			embed.title = fixField(embed.title);
		}

		if (has(embed, 'author', 'name')) {
			embed.author.name = fixField(embed.author.name);
		}

		if (has(embed, 'footer', 'text')) {
			embed.footer.text = fixField(embed.footer.text);
		}

		if (
			embed.fields != null &&
			typeof embed.fields[Symbol.iterator] === 'function'
		) {
			for (const field of embed.fields) {
				if (has(field, 'name')) {
					field.name = fixField(field.name);
				}

				if (has(field, 'value')) {
					field.value = fixField(field.value);
				}
			}
		}
	}

	return embed;
};

module.exports.fixField = fixField;
