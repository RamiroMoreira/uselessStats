import { Meteor } from 'meteor/meteor';
import { Matches } from '../api/matches.js';
import { RunningMatches } from '../api/runningMatches.js';
import { Elo } from '../api/elo.js';
import { Colors } from '../api/colors.js';
import { Stats } from '../api/stats.js';
import { _ } from 'underscore';
var k = 15;

Meteor.startup(() => {
  // code to run on server at startup
SyncedCron.add({
  name: 'Getting last matches',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 1 minute');
  },
  job: function() {
    var getHost = HTTP.call('GET', 'https://us-ws-1.hexarena.io/config/gs-host', {});
    if(getHost.statusCode == 200){
	var getMatches = HTTP.call('GET', 'https://'+getHost.content+'/finished-games', {});
	_.forEach(getMatches.data, function(singleMatch){
		var m = Matches.findOne({_id: singleMatch.id});
		if(!m && singleMatch.mode == '1v1'){
			m = {};	
			m._id = singleMatch.id;
			var rm = RunningMatches.findOne({_id:singleMatch.id});
			
			if(singleMatch.players[0][0].alive){
				m.winer = singleMatch.players[0][0].name;
				m.loser = singleMatch.players[1][0].name;
				if(rm != null){
				m.winerColor =  singleMatch.players[0][0].pattern;
				if(rm.color0 == m.winerColor){
					m.loserColor = rm.color1;	
				}
				else{
					m.loserColor = rm.color0;	
				}
				}

				
				
			}
			else{
				m.loser = singleMatch.players[0][0].name;
				m.winer = singleMatch.players[1][0].name;
				m.winerColor =  singleMatch.players[1][0].pattern;
				if(rm != null){
				if(rm.color0 == m.winerColor){
					m.loserColor = rm.color1;	
				}
				else{
					m.loserColor = rm.color0;	
				}
				}
			}
			m.mode = '1v1'
			m.time = singleMatch.time;
			m.date = new Date();
			Matches.insert(m);
			RunningMatches.remove(rm);
			//update colors statistics
			if(m.winerColor && m.loserColor){
			var winerColor = Colors.findOne({pattern: m.winerColor});
			if(!winerColor){
				winerColor = {pattern: m.winerColor, played: 0, won: 0}
				Colors.insert(winerColor);
			}
			winerColor.played++;
			winerColor.won++;
						
			Colors.update({pattern: winerColor.pattern}, {$set:winerColor})
			
			var loserColor = Colors.findOne({pattern: m.loserColor});
			if(!loserColor){
				loserColor = {pattern: m.loserColor, played: 0, won: 0}
				Colors.insert(loserColor);
			}
			loserColor.played++;
			Colors.update({pattern: loserColor.pattern}, {$set:loserColor})
			}
			//change elo
			var eloPlayer0 = Elo.findOne({name: singleMatch.players[0][0].name});
			var elo0 = 1000;
			var won0 = 0;
			var played0 = 0;
			var streak0 = 0;
			var streakAll0 = 0;			
			if(eloPlayer0 != null){
				elo0 = eloPlayer0.elo;
				won0 = eloPlayer0.won;
				played0 = eloPlayer0.played;
				streak0 = eloPlayer0.streak;
				streakAll0 = eloPlayer0.streakAll;		
			}
			var eloPlayer1 = Elo.findOne({name: singleMatch.players[1][0].name});
			var elo1 = 1000;
			var won1 = 0;
			var played1 = 0;
			var streak1 = 0;
			var streakAll1 = 0;												
			if(eloPlayer1 != null){
				elo1 = eloPlayer1.elo;
				won1 = eloPlayer1.won;
				played1 = eloPlayer1.played;
				streak1 = eloPlayer1.streak;
				streakAll1 = eloPlayer1.streakAll;												
			}
			var e0 = 1/(1 + 10**((elo1-elo0)/400));
			var e1 = 1/(1 + 10**((elo0-elo1)/400));
			if(singleMatch.players[0][0].alive){
				won0 = won0+1;
				streakAll0++;
				streakAll1 = 0;
				streak0 = streak0+1;
				streak1 = 0;
				elo0 = elo0 + k*(1-e0);
				elo1 = elo1 + k*(0-e1);		
			}
			else{
				streakAll1++;
				streakAll0 = 0;
				streak1 = streak1+1;
				streak0 = 0;
				won1 = won1+1;
				elo0 = elo0 + k*(0-e0);
				elo1 = elo1 + k*(1-e1);		
			}
			played1++;
			played0++;
			if(eloPlayer0 != null){
				Elo.update({name: singleMatch.players[0][0].name}, {$set: { elo: elo0, played: played0, won: won0, streak: streak0, streakAll: streakAll0 }});
			}
			else{
				Elo.insert({name: singleMatch.players[0][0].name, elo: elo0, played: played0, won: won0, played2v2:0, won2v2:0, streak: streak0, streakAll: streakAll0, streak2v2: 0 })
			}
			
			if(eloPlayer1 != null){
				Elo.update({name: singleMatch.players[1][0].name}, {$set: { elo: elo1, played: played1, won: won1, streak: streak1, streakAll: streakAll1 }});
			}
			else{
				Elo.insert({name: singleMatch.players[1][0].name, elo: elo1, played: played1, won: won1, played2v2:0, won2v2:0, streak: streak1, streakAll: streakAll1, streak2v2: 0 })
			}
			updateStreaks(singleMatch.players[0][0].name, streak0, streakAll0, 0);
			updateStreaks(singleMatch.players[1][0].name, streak1, streakAll1, 0);
			
			

			 
		}
		else if(!m && singleMatch.mode == '2v2'){
			m = {};	
			m._id = singleMatch.id;
			var rm = RunningMatches.findOne({_id:singleMatch.id});
			if(singleMatch.players[0][0].alive || singleMatch.players[0][1].alive){
				m.winer1 = singleMatch.players[0][0].name;
				m.winer2 = singleMatch.players[0][1].name;
				m.loser1 = singleMatch.players[1][0].name;
				m.loser2 = singleMatch.players[1][1].name;
				if(rm != null){
					m.winerColor0 = singleMatch.players[0][0].pattern;
					m.winerColor1 = singleMatch.players[0][1].pattern;
					if(rm.color00 == m.winerColor0 || rm.color01 == m.winerColor0 || rm.color01 == m.winerColor1 || rm.color00 == m.winerColor1){
						m.winerColor0 = rm.color00;
						m.winerColor1 = rm.color01;
						m.loserColor0 = rm.color10;
						m.loserColor1 = rm.color11;
					}
					else{
						m.winerColor0 = rm.color10;
						m.winerColor1 = rm.color11;
						m.loserColor0 = rm.color00;
						m.loserColor1 = rm.color01;	
					}
				}
			}
			else{
				m.winer1 = singleMatch.players[1][0].name;
				m.winer2 = singleMatch.players[1][1].name;
				m.loser1 = singleMatch.players[0][0].name;
				m.loser2 = singleMatch.players[0][1].name;
				if(rm != null){
					m.winerColor0 = singleMatch.players[1][0].pattern;
					m.winerColor1 = singleMatch.players[1][1].pattern;
					if(rm.color00 == m.winerColor0 || rm.color01 == m.winerColor0 || rm.color01 == m.winerColor1 || rm.color00 == m.winerColor1){
						m.winerColor0 = rm.color00;
						m.winerColor1 = rm.color01;
						m.loserColor0 = rm.color10;
						m.loserColor1 = rm.color11;
					}
					else{
						m.winerColor0 = rm.color10;
						m.winerColor1 = rm.color11;
						m.loserColor0 = rm.color00;
						m.loserColor1 = rm.color01;	
					}
				}
			}
			m.mode = '2v2'
			m.time = singleMatch.time;
			m.date = new Date();
			Matches.insert(m);
			RunningMatches.remove(rm);
			//update color statistics
			if(m.winerColor0 && m.winerColor1 && m.loserColor0 && m.loserColor1){
				var winerColor0 = Colors.findOne({pattern: m.winerColor0});
				if(!winerColor0){
					winerColor0 = {pattern: m.winerColor0, played: 0, won: 0}
					Colors.insert(winerColor0);
				}
				winerColor0.played++;
				winerColor0.won++;
				Colors.update({pattern: winerColor0.pattern}, {$set:winerColor0})
				var winerColor1 = Colors.findOne({pattern: m.winerColor1});
				if(!winerColor1){
					winerColor1 = {pattern: m.winerColor1, played: 0, won: 0}
					Colors.insert(winerColor1);
				}
				winerColor1.played++;
				winerColor1.won++;
				Colors.update({pattern: winerColor1.pattern}, {$set:winerColor1})
				var loserColor0 = Colors.findOne({pattern: m.loserColor0});
				if(!loserColor0){
					loserColor0 = {pattern: m.loserColor0, played: 0, won: 0}
					Colors.insert(loserColor0);
				}
				loserColor0.played++;
				Colors.update({pattern: loserColor0.pattern}, {$set:loserColor0})
				var loserColor1 = Colors.findOne({pattern: m.loserColor1});
				if(!loserColor1){
					loserColor1 = {pattern: m.loserColor1, played: 0, won: 0}
					Colors.insert(loserColor1);
				}
				loserColor1.played++;
				Colors.update({pattern: loserColor1.pattern}, {$set:loserColor1})		
			}
			//change elo
			var eloPlayer00 = Elo.findOne({name: singleMatch.players[0][0].name});
			var elo00 = 1000;
			var won00 = 0;
			var played00 = 0;
			var streak2v200 = 0;
			var streakAll00 = 0;			
			if(eloPlayer00 != null){
				elo00 = eloPlayer00.elo;
				won00 = eloPlayer00.won2v2;
				played00 = eloPlayer00.played2v2;
				streak2v200 = eloPlayer00.streak2v2;
				streakAll00 = eloPlayer00.streakAll;		
			}
			var eloPlayer01 = Elo.findOne({name: singleMatch.players[0][1].name});
			var elo01 = 1000;
			var won01 = 0;
			var played01 = 0;
			var streak2v201 = 0;
			var streakAll01 = 0;						
			if(eloPlayer01 != null){
				elo01 = eloPlayer01.elo;
				won01 = eloPlayer01.won2v2;
				played01 = eloPlayer01.played2v2;
				streak2v201 = eloPlayer01.streak2v2;
				streakAll01 = eloPlayer01.streakAll;			
			}
			var eloPlayer10 = Elo.findOne({name: singleMatch.players[1][0].name});
			var elo10 = 1000;
			var won10 = 0;
			var played10 = 0;
			var streak2v210 = 0;
			var streakAll10 = 0;							
			if(eloPlayer10 != null){
				elo10 = eloPlayer10.elo;
				won10 = eloPlayer10.won2v2;
				played10 = eloPlayer10.played2v2;
				streak2v210 = eloPlayer10.streak2v2;
				streakAll10 = eloPlayer10.streakAll;									
			}
			var eloPlayer11 = Elo.findOne({name: singleMatch.players[1][1].name});
			var elo11 = 1000;
			var won11 = 0;
			var played11 = 0;
			var streak2v211 = 0;
			var streakAll11 = 0;							
			if(eloPlayer11 != null){
				elo11 = eloPlayer11.elo;
				won11 = eloPlayer11.won2v2;
				played11 = eloPlayer11.played2v2;
				streak2v211 = eloPlayer11.streak2v2;
				streakAll11 = eloPlayer11.streakAll;										
			}
			var e0 = 1/(1 + 10**((((elo10 + elo11)/2)-((elo00+elo01)/2))/400));
			var e1 = 1/(1 + 10**((((elo00 + elo01)/2)-((elo10+elo11))/2)/400));
			console.log("e0-2v2 : "+e0 )
			console.log("e1-2v2 : "+e1 )
			if(singleMatch.players[0][0].alive || singleMatch.players[0][1].alive){
				won00 = won00+1;
				won01 = won01+1;
				streak2v200++;
				streakAll00++;
				streak2v201++;
				streakAll01++;
				streak2v210 = 0;
				streakAll10 = 0;
				streak2v211 = 0;
				streakAll11 = 0;
				elo00 = elo00 + k*(1-e0);
				elo01 = elo01 + k*(1-e0);
				elo10 = elo10 + k*(0-e1);				
				elo11 = elo11 + k*(0-e1);		
			}
			else{
				streak2v210++;
				streakAll10++;
				streak2v211++;
				streakAll11++;
				streak2v200 = 0;
				streakAll00 = 0;
				streak2v201 = 0;
				streakAll01 = 0;
				won10 = won10+1;
				won11 = won11+1;
				elo00 = elo00 + k*(0-e0);
				elo01 = elo01 + k*(0-e0);
				elo10 = elo10 + k*(1-e1);				
				elo11 = elo11 + k*(1-e1);		
			}
			
			played10++;
			played11++;
			played00++;
			played01++;
			if(eloPlayer00 != null){
				Elo.update({name: singleMatch.players[0][0].name}, {$set: { elo: elo00, played2v2: played00, won2v2: won00, streak2v2: streak2v200, streakAll: streakAll00}});
			}
			else{
				Elo.insert({name: singleMatch.players[0][0].name, elo: elo00, played: 0, won: 0, played2v2: played00, won2v2: won00, streak: 0, streak2v2: streak2v200, streakAll: streakAll00 })
			}
			if(eloPlayer01 != null){
				Elo.update({name: singleMatch.players[0][1].name}, {$set: { elo: elo01, played2v2: played01, won2v2: won01, streak2v2: streak2v201, streakAll: streakAll01 }});
			}
			else{
				Elo.insert({name: singleMatch.players[0][1].name, elo: elo01, played: 0, won: 0, played2v2: played01, won2v2: won01, streak: 0, streak2v2: streak2v201, streakAll: streakAll01 })
			}
			if(eloPlayer10 != null){
				Elo.update({name: singleMatch.players[1][0].name}, {$set: { elo: elo10, played2v2: played10, won2v2: won10, streak2v2: streak2v210, streakAll: streakAll10 }});
			}
			else{
				Elo.insert({name: singleMatch.players[1][0].name, elo: elo10, played: 0, won: 0, played2v2: played10, won2v2: won11, streak: 0, streak2v2: streak2v210, streakAll: streakAll10 })
			}
			if(eloPlayer11 != null){
				Elo.update({name: singleMatch.players[1][1].name}, {$set: { elo: elo11, played2v2: played11, won2v2: won11, streak2v2: streak2v211, streakAll: streakAll11 }});
			}
			else{
				Elo.insert({name: singleMatch.players[1][1].name, elo: elo11, played: 0, won: 0, played2v2: played11, won2v2: won11, streak: 0, streak2v2: streak2v211, streakAll: streakAll11 })
			}
			updateStreaks(singleMatch.players[0][0].name, 0, streakAll00, streak2v200);
			updateStreaks(singleMatch.players[0][1].name, 0, streakAll01, streak2v201);
			updateStreaks(singleMatch.players[1][0].name, 0, streakAll10, streak2v210);
			updateStreaks(singleMatch.players[1][1].name, 0, streakAll11, streak2v211);
			
		}	
	})
    }

  }
});



SyncedCron.add({
  name: 'Getting running matches',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 15 seconds');
  },
  job: function() {
    var getHost = HTTP.call('GET', 'https://us-ws-1.hexarena.io/config/gs-host', {});
    if(getHost.statusCode == 200){
	checkOngoing(getHost.content);	
	
    }

  }
});

SyncedCron.start();

});

var checkOngoing = function(host){
	var getMatches = HTTP.call('GET', 'https://'+host+'/running-games', {});
	_.forEach(getMatches.data, function(singleMatch){
		console.log("getting running matches2");	
		var m = RunningMatches.findOne({_id: singleMatch.id});
		if(!m && singleMatch.mode == '1v1'){
			m = {};	
			m._id = singleMatch.id;
			m.color0 = singleMatch.players[0][0].pattern;
			m.color1 = singleMatch.players[1][0].pattern;
			RunningMatches.insert(m);
		}
		if(!m && singleMatch.mode == '2v2'){
			m = {};	
			m._id = singleMatch.id;
			m.color00 = singleMatch.players[0][0].pattern;
			m.color01 = singleMatch.players[0][1].pattern;
			m.color10 = singleMatch.players[1][0].pattern;
			m.color11 = singleMatch.players[1][1].pattern;
			RunningMatches.insert(m);
		}
	});
}

var updateStreaks = function(name, streak, streakAll, streak2v2){
	var singleStat = Stats.findOne({});
	if(!singleStat){
		Stats.insert({maxStreak: name, maxStreakValue: streak, maxStreakAll: name, maxStreakAllValue: streakAll, maxStreak2v2: name, maxStreak2v2Value: streak2v2})
	}
	else{
		if(streak > singleStat.maxStreakValue){
			Stats.update({},{$set:{maxStreak: name, maxStreakValue: streak}})
		}
		if(streakAll > singleStat.maxStreakAllValue){
			Stats.update({},{$set:{maxStreakAll: name, maxStreakAllValue: streakAll}})
		}
		if(streak2v2 > singleStat.maxStreak2v2Value){
			Stats.update({},{$set:{maxStreak2v2: name, maxStreak2v2Value: streak2v2}})
		}
	}
}
