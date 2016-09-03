'use strict';

var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var ical = require('ical');
var Promise = require('promise');
var _ = require('underscore');

var fbMessage = require('../fb-connect.js');

const weather = require('./weather.js');
const greeting = require('./greeting.js');
const food = require('./food.js');
const bus = require('./bus.js');
const calendar = require('./calendar.js');
const sessions = require('../sessions.js').sessions;

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

exports.actions = {
	send(request, response) {
		const {sessionId, context, entities} = request;
		const {text, quickreplies} = response;
		const recipientId = sessions[sessionId].fbid;
		if (recipientId) {
			if (context.generic) {
				return fbMessage.sendGenericMessage(recipientId, context.url, context.title, context.subtitle)
				.then(() => {})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			} else if(context.generics) {
				return fbMessage.sendMultiGenericMessage(recipientId, context.elements)
				.then(() => {})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			} else {
				return fbMessage.sendTextMessage(recipientId, text)
				.then(() => {
					return Promise.resolve();
				})
				.catch((err) => {
					console.error(
						'Oops! An error occurred while forwarding the response to',
						recipientId,
						':',
						err.stack || err
						);
				});
			}
		} else {
			console.error('Oops! Couldn\'t find user for session:', sessionId);
			return Promise.resolve()
		}
	},
	sendGreetings: 		greeting.sendGreetings,
	replyThanks: 		greeting.replyThanks,
	replyInsult: 		greeting.replyInsult,
	replyAuthor: 		greeting.replyAuthor,
	replyGender: 		greeting.replyGender,
	replyFunction: 		greeting.replyFunction,
	getMenu: 			food.getMenu,
	getRestaurantRate: 	food.getRestaurantRate,
	getFoodType: 		food.getFoodType,	
	getWeather: 		weather.getWeather,
	getBusTime:			bus.getBusTime,
	getCalendar: 		calendar.getCalendar,
};