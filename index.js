var request = require('request');
var restify = require('restify');
var crypto = require('crypto');
var fetch = require('node-fetch');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var _ = require('underscore');
var fs = require('fs');

require('dotenv').config();

const sessions = require('./sessions.js').sessions;
const findOrCreateSession = require('./sessions.js').findOrCreateSession;
const actions = require('./actions/index.js').actions;

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
				sessions[sessionId].context = context;
			}).catch((err) => {
				console.error('Oops! Got an error from Wit: ', err.stack || err);
			})
		}
	}
	res.send(200, "success");
});

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

const wit = new Wit({
	accessToken: process.env.WIT_TOKEN,
	actions,
});

server.listen(443);