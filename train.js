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
var ical = require('ical')

require('dotenv').config();

var allCalData = [];
var index = 0;

ical.fromURL('https://calendar.google.com/calendar/ical/ncu.acad@gmail.com/public/basic.ics', {}, function(err, data) {
	for (var k in data){
		if (data.hasOwnProperty(k)) {
			var ev = data[k];
			var calEventName = ev.summary;
			calEventName = calEventName.split("(");
			calEventName = calEventName[0];
			allCalData.push(calEventName);
		}
	}

	postData(allCalData[index]);
});

function postData(value) {
	var options = {
		uri: 'https://api.wit.ai/entities/cal_event/values?v=20160526',
		qs: {
			access_token: process.env.WIT_TOKEN,
		},
		headers: {
			'Content-Type': 'application/json'
		},
		json: true,
		method: "POST",
		body: {
			"value": value
		}
	};

	rp(options)
	.then(function (repos) {
		index++;
		if (index != allCalData.length)
			postData(allCalData[index]);
		console.log(repos);
	})
	.catch(function (err) {
		index++;
		if (index != allCalData.length)
			postData(allCalData[index]);
		console.log(err);
	});
}
