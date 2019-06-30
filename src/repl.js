const repl = require('repl');
const {Transform} = require('stream');

const {Console} = console;

const suppressPrompt = (replServer, defaultEval) => (...args) => {
	const prompt = replServer._prompt;
	replServer.setPrompt('');
	defaultEval(...args);
	replServer.setPrompt(prompt);
	replServer.displayPrompt(true);
};

module.exports = client => {
	const replserver = repl.start({
		prompt: '> ',
		useGlobal: false
	});

	replserver.eval = suppressPrompt(replserver, replserver.eval);
	replserver.context.client = client;
	replserver.context.replserver = replserver;

	replserver.on('exit', () => {
		client.shard.send('exit');
	});

	class REPLStream extends Transform {
		_transform(chunk, encoding, callback) {
			const str = '\r\u001B[K' + chunk;
			callback(null, str);
			replserver.displayPrompt(true);
		}
	}

	const stream = new REPLStream();

	const newconsole = new Console(stream);

	Reflect.defineProperty(global, 'console', {
		get() {
			return newconsole;
		},
		enumerable: true,
		configurable: true
	});

	stream.pipe(process.stdout);
};
