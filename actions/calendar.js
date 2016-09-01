var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var ical = require('ical');
var Promise = require('promise');
var _ = require('underscore');
var async = require('async');

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

exports.getCalendar = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		delete context.calResult;
		ical.fromURL('https://calendar.google.com/calendar/ical/ncu.acad@gmail.com/public/basic.ics', {}, function(err, data) {
			var entityEventName = firstEntityValue(entities, 'cal_event');
			if (!entityEventName) {
				context.notFound = true;
				delete context.calResult;
				return resolve(context);
			}
			var result = [];
			var index = 0;
			async.each(data, function(value, callback){
				index++;
				const similarity = stringSimilarity.compareTwoStrings(value.summary, entityEventName);
				const timeDiff = moment(value.start).diff(moment());
				if (similarity > 0 && timeDiff > 0) {
					value.similarity = {
						time: timeDiff,
						text: stringSimilarity.compareTwoStrings(value.summary, firstEntityValue(entities, 'cal_event'))
					};
					result.push(value);
				}
				callback();
			}, function(err) {
				console.log(result);
				if (result.length) {
					result = _.min(result, function(value) {
						return value.similarity.time;
					});

					moment.locale('zh-tw');
					if (result.end && moment(result.start).format != moment(result.end))
						context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll') + " 到 " + moment(result.end).format('ll');
					else
						context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll');
					delete context.notFound;
				} else {
					context.notFound = true;
					delete context.calResult;
				}

				return resolve(context);
			});
		});
	});
}