var request = require('request');
var restify = require('restify');
var crypto = require('crypto');
var fetch = require('node-fetch');
var _ = require('underscore');
fs = require('fs');
require('dotenv').config();

try {
  	Wit = require('../').Wit;
	interactive = require('../').interactive;
} catch (e) {
	Wit = require('node-wit').Wit;
	interactive = require('node-wit').interactive;
}

var token = process.env.PAGE_TOKEN;
var server = restify.createServer({
	certificate: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.crt'),
	key: fs.readFileSync('/home/stanley/bot.ncufood.info/ca.key'),
	ca: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.ca-bundle'),
	cert: fs.readFileSync('/home/stanley/bot.ncufood.info/bot.ncufood.info.crt'),
	name: "food-bot",
	passphrase: process.env.PASSPHARSE
});
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/', function create(req, res, next) {
	res.send(201, Math.random().toString(36).substr(3, 8));
	return next();
});

server.get('/webhook/', function(req, res) {
	console.log(req.query);
	if (req.query.hub.verify_token === process.env.VERIFY_TOKEN) {
		res.send(200, parseInt(req.query.hub.challenge));
	} else 
		res.send('Error, wrong validation token');

	return next();
});

server.post('/webhook/', function (req, res) {
	messaging_events = req.body.entry[0].messaging;
	for (i = 0; i < messaging_events.length; i++) {
		event = req.body.entry[0].messaging[i];
		sender = event.sender.id;
		var sessionId = findOrCreateSession(sender);
		if (event.message && event.message.text) {
			text = event.message.text;
			wit.runActions(
				sessionId, // the user's current session
				text, // the user's message
				sessions[sessionId].context // the user's current session state
			).then((context) => {
				console.log('Waiting for next user messages');
				sessions[sessionId].context = context;
			}).catch((err) => {
				console.error('Oops! Got an error from Wit: ', err.stack || err);
			})
		}
	}
	res.send(200);
});

const sessions = {};
const findOrCreateSession = (fbid) => {
	let sessionId;
	Object.keys(sessions).forEach(k => {
		if (sessions[k].fbid === fbid) {
			sessionId = k;
		}	
	});
	if (!sessionId) {
		sessionId = new Date().toISOString();
		sessions[sessionId] = {fbid: fbid, context: {}};
	}
	return sessionId;
};

const firstEntityValue = (entities, entity) => {
	const val = entities && entities[entity] &&
	Array.isArray(entities[entity]) &&
	entities[entity].length > 0 &&
	entities[entity][0].value;
	if (!val) {
		return null;
	}
	return typeof val === 'object' ? val.value : val;
};

const actions = {
	send(request, response) {

		const {sessionId, context, entities} = request;
		const {text, quickreplies} = response;
		const recipientId = sessions[sessionId].fbid;
		if (recipientId) {
			return sendTextMessage(recipientId, text)
			.then(() => null)
			.catch((err) => {
				console.error(
					'Oops! An error occurred while forwarding the response to',
					recipientId,
					':',
					err.stack || err
					);
			});
		} else {
			console.error('Oops! Couldn\'t find user for session:', sessionId);
			return Promise.resolve()
		}
	},sendGreetings({context, entities}) {
		return new Promise(function(resolve, reject) {
				var results = [
						"您好，我是中大美食機器人\n 我不叫Siri，很高興為您服務",
						"安安，你好",
						"您好，我是中大美食機器人",
						"安安，給虧嗎？",
						"您好，請問有什麼可以為您服務的嗎？",
						"請問需要什麼服務嗎？",
						"你好！！很高興問您服務"
					]
		        context.greeting = _.sample(results);
			return resolve(context);
	    });
	},
};

const wit = new Wit({
	accessToken: process.env.WIT_TOKEN,
	actions,
});

function sendTextMessage(id, text) {
	const body = JSON.stringify({
		recipient: { id },
		message: { text },
	});
	const qs = 'access_token=' + encodeURIComponent(token);
	return fetch('https://graph.facebook.com/v2.6/me/messages?' + qs, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body,
	})
	.then(rsp => rsp.json())
	.then(json => {
		if (json.error && json.error.message) {
			throw new Error(json.error.message);
		}
		return json;
	});
};

server.listen(443);