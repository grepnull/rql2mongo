var rql = require('rql/parser').parse;
var _ = require('lodash');

const operators = {
	and: logical('$and'),

	or: logical('$or'),

	nor: logical('$nor'),

	eq: function(args) {
		var obj = {};
		obj[args[0]] = args[1];
		return obj;
	},

	ne: comparison('$ne'),

	lt: comparison('$lt'),

	ge: comparison('$gte'),

	le: comparison('$lte'),

	in: comparison('$in'),

	nin: comparison('$nin'),

	contains: comparison('$in', { coerceArray: true }),

	excludes: comparison('$nin', { coerceArray: true }),

	match: comparison('$regex', { extra: { $options: 'i'} }),
};

function rql2Mongo(query, options) {
	options = options || {};
	if (typeof query !== 'object') {
		query = rql(query, options.parameters);
	}

	return toMongo(query);
}

function toMongo(q) {
	if (q && typeof q === 'object') {
		if (Array.isArray(q)) {
			return q.map(function (x) {
				return toMongo(x);
			});
		}
		else {
			var operator = operators[q.name];
			if (operator) {
				return operator(toMongo(q.args));
			}
			else {
				throw new Error('unknown operator: ' + q.name);
			}
		}
	}
	else {
		return q;
	}
}

function comparison(operator, options) {
	return function (args) {
		var path = args[0];
		var value = args[1];
		if (Array.isArray(path)) {
			path = path.join('.');
		}

		var comparisonQuery = {};
		var criteria = {};
		if (options && options.coerceArray) {
			value = Array.isArray(value) ? value : [value];
		}
		criteria[operator] = value;
		if (options && typeof options.extra === 'object') {
			_.merge(criteria, options.extra);
		}
		comparisonQuery[path] = criteria;

		return comparisonQuery;
	}
}

function logical(operation) {
	return function(args) {
		var queries = [];
		args.forEach(function (q) {
			queries.push(q);
		});

		var logicalQuery = {};
		logicalQuery[operation] = queries;
		return logicalQuery;
	}
}

module.exports = rql2Mongo;
