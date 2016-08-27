var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var ical = require('ical');
var Promise = require('promise');
var _ = require('underscore');

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
		ical.fromURL('https://calendar.google.com/calendar/ical/ncu.acad@gmail.com/public/basic.ics', {}, function(err, data) {
			var entityEventName = firstEntityValue(entities, 'cal_event');
			return new Promise(function(resolve, reject) {
				var result = [];
				_.each(data, function(value, key) {
					const similarity = stringSimilarity.compareTwoStrings(value.summary, firstEntityValue(entities, 'cal_event'));
					const timeDiff = moment(value.start).diff(moment());
					if (similarity > 0.5 && timeDiff > 0) {
						value.similarity = {
							time: timeDiff,
							text: stringSimilarity.compareTwoStrings(value.summary, firstEntityValue(entities, 'cal_event'))
						};
						result.push(value);
					}
				});
				return resolve(result);
			}).then(function(result) {
				if (result.length) {
					result = _.min(result, function(value) {
						return value.similarity.time;
					});

					console.log(result);

					moment.locale('zh-tw');
					if (result.end && moment(result.start).format != moment(result.end))
						context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll') + " 到 " + moment(result.end).format('ll');
					else
						context.calResult = "\n" + result.summary + "\n" + moment(result.start).format('ll');
				} else {
					context.notFound = true;
				}

			}).then(function() {
				return resolve(context);
			});
		});
	});
}