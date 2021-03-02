import { Meteor } from 'meteor/meteor';
import { Elo } from './elo';
import { Colors } from './colors';
import { Stats } from './stats';
if (Meteor.isServer) {
	console.log("publishing22")
	Meteor.publish('elos', function () {
    		console.log("publishing")

		var setIndex = function(doc) {
			doc.index = Elo.find({played:{$gte:10}, elo:{$gt:doc.elo}}).count()+1;
    			return doc;
  		}

		 var self = this;

  		var observer = Elo.find({played:{$gte: 10}}, {$sort:{elo:-1}}).observe({
      			added: function (document) {
      				self.added('elo', document._id, setIndex(document));
    			},
    			changed: function (newDocument, oldDocument) {
      				self.changed('elo', oldDocument._id, setIndex(newDocument));
    			},
    			removed: function (oldDocument) {
      				self.removed('elo', oldDocument._id);
    			}
		
 		 });

  		self.onStop(function () {
    			observer.stop();
  		});

  		self.ready();

	})

	Meteor.publish('colors', function () {
    		return Colors.find({},{});
	})

	Meteor.publish('stats', function () {
    		return Stats.find({},{});
	})
}
