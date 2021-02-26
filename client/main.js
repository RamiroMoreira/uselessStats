import { Template } from 'meteor/templating';
import { Matches } from '../api/matches';
import { Elo } from '../api/elo';
import { Colors } from '../api/colors'; 
import { Stats } from '../api/stats';       
import './main.html';
import bootstrap from 'bootstrap';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap-grid.css';
import 'bootstrap/dist/css/bootstrap-utilities.css';
import '@fortawesome/fontawesome-free/js/all.js';



import d3 from 'd3';
var gameMode = new ReactiveVar();
Template.eloList.created = function(){
	gameMode.set("All")
} 
Template.eloList.helpers({
  elos(){
	var count = 1;
	return Elo.find({}, {sort: {elo:-1}, transform:function(doc){
		doc.index = count;
		count++;
		return doc;
	}});	
  },
  getGameMode(){
	return gameMode.get();
  }
});

Template.eloList.events({
  'click #gameMode1':function(){
	gameMode.set("1v1")
  },
  'click #gameMode2':function(){
	gameMode.set("2v2")
  },
  'click #gameModeAll':function(){
	gameMode.set("All")
  }	
})

Template.singleElo.helpers({
  roundElo(elo){
	return Math.round(elo);
  },
  getWinRate(played, played2v2, won, won2v2){
	if(gameMode.get() == "All"){
		return ""+Math.round(((won+won2v2)/(played+played2v2)) * 100)+"%";
	}
	else if(gameMode.get() == "1v1"){
		return played != 0 ? ""+Math.round(((won)/(played)) * 100)+"%" : "-";
	}
	else if(gameMode.get() == "2v2"){
		return played2v2 != 0 ? ""+Math.round(((won2v2)/(played2v2)) * 100)+"%" : "-";
	}
  },
  getPlayed(played, played2v2){
	if(gameMode.get() == "All"){
		return played+played2v2;
	}
	else if(gameMode.get() == "1v1"){
		return played;
	}
	else if(gameMode.get() == "2v2"){
		return played2v2;
	}
  },
  getStreakClass(streak, streakAll, streak2v2){
	var s = 0;	
	if(gameMode.get() == "All"){
		s = streakAll;
	}
	else if(gameMode.get() == "1v1"){
		s = streak;
	}
	else if(gameMode.get() == "2v2"){
		s = streak2v2;
	}
	if(s == 0 || s == null){
		return "d-none";	
	}
	if(s < 3){
		return "bd-grey-400"
	}
	else if(s < 6){
		return "bd-green-400"
	}
	else if(s < 12){
		return "bd-blue-400"
	}
	else if(s < 24){
		return "bd-purple-400"
	}
	else if(s < 48){
		return "bd-yellow-400"
	}
  },
  getStreak(streak, streakAll, streak2v2){
	var s = 0;	
	if(gameMode.get() == "All"){
		s = streakAll;
	}
	else if(gameMode.get() == "1v1"){
		s = streak;
	}
	else if(gameMode.get() == "2v2"){
		s = streak2v2;
	}
	return s;
  }
})

Template.colorsPie.rendered = function(){
	Deps.autorun(function () {




	var colorsList = Colors.find({}).fetch();
	var div = d3.selectAll("#d3content").style("font", "16px sans-serif")
	      .style("text-align", "right")
	      .style("color", "white")
 .style("padding", "30px");

  // Define the initial (empty) selection for the bars.
  const bar = div.selectAll("div");

  // Bind this selection to the data (computing enter, update and exit).
  const barUpdate = bar.data(colorsList);

  // Join the selection and the data, appending the entering bars.
  const barNew = barUpdate.join("div")


 
  // Apply some styles to the bars.
  barNew.style("background", c => c.pattern);
  barNew.style("padding", "15px");
  barNew.style("margin", "5px");
  barNew.attr("class", "bar");
  barNew.attr("data-toggle", "tooltip");
  barNew.attr("data-placement", "top");
  barNew.attr("title", c => "Total games: "+c.played);

  // Set the width as a function of data.
  barNew.style("width", c => `${(c.won/c.played) * 100}%`);

  // Set the text of each bar as the data.
  barNew.text(c => ""+(Math.round((c.won/c.played) * 100))+"%");

})
}

Template.maxStreaks.helpers({
  streaks(){
	return Stats.findOne({});	
  },
  getColor(s){
	console.log("s" + s)
	if(s < 3){
		return "grey-400"
	}
	else if(s < 6){
		return "green-400"
	}
	else if(s < 12){
		return "blue-400"
	}
	else if(s < 24){
		return "purple-400"
	}
	else if(s < 48){
		return "yellow-400"
	}
  }
})
