import { Meteor } from 'meteor/meteor';
import { Elo } from './elo';
import { Colors } from './colors';
import { Stats } from './stats';
if (Meteor.isServer) {
	console.log("publishing22")
	Meteor.publish('elos', function () {
    		console.log("publishing")
    		return Elo.find({played:{$gte: 10}},{$sort:{elo:-1}});
	})

	Meteor.publish('colors', function () {
    		return Colors.find({},{});
	})

	Meteor.publish('stats', function () {
    		return Stats.find({},{});
	})
}
