'use strict';

var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
var _ = require('underscore');
var async = require('async');
var Flickr = require('flickrapi'),
    flickrOptions = {
      api_key: process.env.FLICKR_KEY,
      secret: process.env.FLICKR_SECRET
    };;

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

exports.getWeather = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		const dateTime = firstEntityValue(entities, "datetime");
		if (!dateTime || moment().diff(dateTime, 'minutes', true) > 0) {
			request('http://api.openweathermap.org/data/2.5/weather?lat=24.968129&lon=121.192645&units=metric&lang=zh_tw&APPID=' + process.env.WEATHER_KEY, function(error, response, body) {
				var result = JSON.parse(body);
				context.temperature = "現在中央的氣溫為\n攝氏" + result.main.temp ;
				context.elements = [];
				context.generics = true;	
				Flickr.tokenOnly(flickrOptions, function(error, flickr) {
					flickr.photos.search({
						text: result.weather[0].main,
						per_page: 10,
						group_id: "1463451@N25"
					}, function(err, flickrResult) {
						if(!err) {
							flickrResult = _.sample(flickrResult.photos.photo);
							context.elements.push({
								"subtitle": "攝氏" + result.main.temp ,
								"title": "目前中央天氣 " + result.weather[0].description,
								"image_url": "https://farm" + flickrResult.farm + ".staticflickr.com/" + flickrResult.server + "/" + flickrResult.id + "_" + flickrResult.secret + ".jpg"
							});
							return resolve(context);
						} else {
							console.log(err);
							callback("get photo error");
						}
					});
				});
			});
		} else {
			request('http://api.openweathermap.org/data/2.5/forecast/daily?lat=24.968129&lon=121.192645&lang=zh_tw&cnt=7&units=metric&APPID=' + process.env.WEATHER_KEY, function(error, response, body) {
				var result = JSON.parse(body);
				context.temperature = "\n攝氏";
				context.elements = [];
				context.generics = true;	
				moment.locale("zh-tw");
				async.each(result.list, function(value, callback) {
					Flickr.tokenOnly(flickrOptions, function(error, flickr) {
						flickr.photos.search({
							text: value.weather[0].main,
							per_page: 25,
							group_id: "1463451@N25"
						}, function(err, flickrResult) {
							if(!err) {
								flickrResult = _.sample(flickrResult.photos.photo);
								context.elements.push({
									"subtitle": "最高溫：" + value.temp.max + "\u000A" + "最低溫：" + value.temp.min,
									"title": moment(value.dt, "X").format("dddd") + " " + value.weather[0].description,
									"image_url": "https://farm" + flickrResult.farm + ".staticflickr.com/" + flickrResult.server + "/" + flickrResult.id + "_" + flickrResult.secret + ".jpg",
									"dt" :value.dt
								});
								callback();
							} else {
								console.log(err);
								callback("get photo error");
							}
						});
					});
				}, function(err) {
					context.elements = _.sortBy(context.elements, "dt");
					var result = [];
					async.each(context.elements, function(value, callback) {
						delete value.dt;
						result.push(value);						
						callback();
					});
					context.elements.splice(0,1);
					return resolve(context);
				});
			});
		}
    });
}