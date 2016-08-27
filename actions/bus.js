'use strict';

var request = require('request');
var htmlparser = require("htmlparser2");
var stringSimilarity = require('string-similarity');
var moment = require('moment');
var rp = require('request-promise');
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

exports.getBusTime = function({context, entities}) {
	return new Promise(function(resolve, reject) {
		const entitiesBusStop = firstEntityValue(entities, 'bus_stop');
		const entitiesBusRoute = firstEntityValue(entities, 'bus_route');
		if (entitiesBusRoute)
			context.bus_route = entitiesBusRoute;
		if (entitiesBusStop)
			context.bus_stop = entitiesBusStop;

		if (!context.bus_stop) {
			context.missingStop = true;
			delete context.bus_time;
			return resolve(context);
		} else if(!context.bus_route) {
			context.missingRoute = true;
			delete context.bus_time;
			return resolve(context);
		} 



		if (context.bus_stop && context.bus_route){
			const busList = ["133", "132", "172", "132_A"];
			const busIdList = {
				"133": "133",
				"132": "3220",
				"172": "3221",
				"3222": "132_A"
			};
			var routeSimilarity = stringSimilarity.findBestMatch(context.bus_route, busList);
			var url = "https://api.cc.ncu.edu.tw/bus/v1/routes/" + busIdList[stringSimilarity.findBestMatch(context.bus_route, busList).bestMatch.target] + "/estimate_times";
			request({
				headers: {
					"X-NCU-API-TOKEN": process.env.NCU_API_TOKEN
				},
				url: url}, function(error, response, body) {
					const allBusStop = _.pluck(JSON.parse(body).BusDynInfo.BusInfo.Route.EstimateTime, "StopName");
					var stopSimilarity = stringSimilarity.findBestMatch(context.bus_stop, allBusStop);
					const estimateTimeResult = _.find(JSON.parse(body).BusDynInfo.BusInfo.Route.EstimateTime, function(stop) {
						return stop.StopName === stopSimilarity.bestMatch.target;
					});
					const currentTime = moment();
					const busComeTime = moment(moment().format('MMMM Do YYYY, ' + estimateTimeResult.comeTime + ':00'), 'MMMM Do YYYY, hh:mm:ss');
					var subtractTime = busComeTime.diff(currentTime, 'minutes', true);
					context.bus_time = subtractTime.toFixed(0) + "分鐘";

					delete context.missingRoute;
					delete context.missingStop;
					return resolve(context);
				});
		}
	});
}