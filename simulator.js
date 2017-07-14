var simulatorTimer = 0;
var calculateDistanceTimer = 0;
var radius; // m
var altitude; // m
var distance = 0;
var startTrackingDistance = 0;
var sendHomeTimer = 0;
var simulationStarted = false;
var accDistance = 0;
var countFrames = 0;
var protocol = 2;
var home0 = [47.403583,8.535850];
var homePosition;


function Speed(value){
	var speed = (value/3600)*1000;
	return speed
}

$(function(){

	window.addEventListener('message', handleResponseFromMissionPlanner, false); 

	$("#simulator-start").click(function(){
		if($("#simulation-type").val() == 3){
			sendMessageToMissionPlanner('getHome');
			//sendMessageToMissionPlanner('getPath');
		}
		/*else
			sendMessageToMissionPlanner('setHome');*/

		accDistance = 0;
		radius = $("#simulator-distance").val();
		altitude = $("#simulator-altitude").val();
		startDistance = radius;
		simulationStarted = true;
		enableDisableButtons();
		$("#simulator-log").html('');
		var timerInterval = $("#simulation-frequency").val();
	    sendHomeTimer = new Date().getTime();
		var home = new LatLon(home0[0],home0[1]);
		var p1 = new LatLon(home.lat,home.lon);
		var directions = {left:1,right:2};
		var direction = directions.right;
		var navDistance = 0;
		var NMEAGPGGA = buildPacket(p1.lat,p1.lon,altitude);
		$("#simulator-log").append(NMEAGPGGA + '\n');
		
		simulatorTimer = setInterval(function(){
			/*if(debugEnabled) {
				console.log();
			}*/

			if($("#simulation-type").val() == 3) {
				if(typeof homePosition == 'undefined')
					return;
				else {
					p1 = new LatLon(homePosition.x,homePosition.y)
				}
			}
			
			if(new Date().getTime() - sendHomeTimer < 5000){
				distance = 0;
				heading = 0;
				p2 = home.destinationPoint(distance, heading);
			} else {
				// Speed
				var varTime = (new Date().getTime() - calculateDistanceTimer);
				if(calculateDistanceTimer == 0)
					varTime = 0;//timerInterval;
				distance = Speed($("#simulator-speed").val()) * (varTime/1000);
				if(accDistance < startDistance ) {
					heading = 0;
					accDistance += distance;
					p2 = p1.destinationPoint(distance, heading);
				} else {
					switch($("#simulation-type").val()){

						case '1': //Circular
							if(direction == directions.right) {
								heading += degreesPerSecond(distance,radius);
								if(heading >= 360*2)
									direction = directions.left;
							} else if(direction == directions.left) {
								heading -= degreesPerSecond(distance,radius);
								if(heading <= 0)
									direction = directions.right;
							}
							p2 = home.destinationPoint(radius, heading);
							break;

						case '2': //Parallel
							if(navDistance <= 300)
								navDistance += distance;
							else {
								navDistance = -300;
								if(direction == directions.left)
									direction = directions.right;
								else if(direction == directions.right)
									direction = directions.left;
							}
							if(direction == directions.right)
								heading = 90;
							else if(direction == directions.left)
								heading = 270;
							p2 = p1.destinationPoint(distance, heading);
							break;

						case '3': //Custom
							if(accDistance == 0) {
								
							}
					}
				}
			}
			
			NMEAGPGGA = buildPacket(p2.lat,p2.lon,altitude);
			countFrames++;
			if(countFrames > 300){
				countFrames = 0;
				$("#simulator-log").html('');
			}
			$("#simulator-log").append(NMEAGPGGA + '\n');
			$("#simulator-log").scrollTop($('#simulator-log')[0].scrollHeight);
			p1 = p2;
			calculateDistanceTimer = new Date().getTime();
		},timerInterval);
	});
	$("#simulator-stop").click(function(){
		simulationStarted = false;
		enableDisableButtons();
		clearInterval(simulatorTimer);
	});
});



function buildPacket(lat,lon,altitude){
	var packet;
	var protocol = $("#simulation-protocol").val();
	if(protocol == 1){
		packet = buildGPGGA(lat,lon,altitude);
		if(!debugEnabled)
			serialSend(connectionId, str2ab(packet + '\n'));
	} else if(protocol == 2 ) {
		packet = build_mavlink_msg_gps_raw_int(lat,lon,altitude);
		chrome.serial.send(connectionId,packet.buffer,function(){});
		if(!debugEnabled)
			serialSend(connectionId, str2ab('\n'));
	} else if(protocol == 3){
		packet = Data2Pitlab(11,altitude,lat,lon);
		if(!debugEnabled)
			serialSend(connectionId, str2ab(packet + '\n'));
	}	
	return packet;
}

function buildGPRMC(lat,lon,altitude)
{
	var dateObj = new Date();
	
	var year  = dateObj.getUTCFullYear();
	var month = dateObj.getUTCMonth() + 1;
	var day = dateObj.getUTCDate();

	var hour = dateObj.getUTCHours();
	var minute = dateObj.getUTCMinutes();
	var second = dateObj.getSeconds();
	
	var latDeg = Math.floor(Math.abs(lat));
	var latMin = (Math.abs(lat) - latDeg) * 60;
	latMin = latMin.toFixed(4);
	latMin = latMin.toString();

	var degStr ="00000" + latDeg;
	degStr = degStr.substring(degStr.length - 2);

    var minStr = "000" + latMin;
    minStr = minStr.substring(minStr.length - 7);

    var latStr = degStr + minStr;

	var  lonDeg = Math.floor(Math.abs(lon));
	var  lonMin = (Math.abs(lon) - lonDeg) * 60;
		 lonMin = lonMin.toFixed(4);
		 lonMin = lonMin.toString();

	var degStr = "00000" + lonDeg;
	degStr = degStr.substring(degStr.length - 3);

    var minStr = "000" + lonMin;
    	minStr = minStr.substring(minStr.length - 7);


    var lonStr = degStr + minStr;

	var ns = "N";
	if (lat < 0) ns ="S";

	var ew="E";
	if (lon < 0) ew ="W";

	var d = new Date(year, month, day, hour, minute, second, 0);


	var theTime = String("0" + hour).slice(-2);
		theTime += String("0" + minute).slice(-2);
		theTime += String("0" + second).slice(-2);
		theTime += ".000";

	var theDate="";
		theDate += String("0" + day).slice(-2);
		theDate += String("0" + month).slice(-2); //javascript does month 0-11 not 1-12
		theDate += String("0" + year - 2000).slice(-2);

	var retV="";
	retV += "$GPRMC";
	retV += "," + theTime;//timestamp
	retV += ",A";//valid 
	retV += "," + latStr;//lat
	retV += "," + ns;// N or S
	retV += "," + lonStr; //lon
	retV += "," + ew;// E or W
	retV += ",0.0";//speed in Knots
	retV += ",0.0";//course
	retV += "," + theDate;//date
	retV += ",0.0";// magnetic variation
	retV += ",W*";//magnetic variation E or W

	checksum = nmeaChecksum(retV.substring(1,retV.length - 1));

	retV += "" + checksum.toString(16);
	
	return retV;
}

function buildGPGGA(lat,lon,altitude)
{
	var dateObj = new Date();
	
	var year  = dateObj.getUTCFullYear();
	var month = dateObj.getUTCMonth() + 1;
	var day = dateObj.getUTCDate();

	var hour = dateObj.getUTCHours();
	var minute = dateObj.getUTCMinutes();
	var second = dateObj.getSeconds();
	
	var latDeg = Math.floor(Math.abs(lat));
	var latMin = (Math.abs(lat) - latDeg) * 60;
	latMin = latMin.toFixed(4);
	latMin = latMin.toString();

	var degStr ="00000" + latDeg;
	degStr = degStr.substring(degStr.length - 2);

    var minStr = "000" + latMin;
    minStr = minStr.substring(minStr.length - 7);

    var latStr = degStr + minStr;

	var  lonDeg = Math.floor(Math.abs(lon));
	var  lonMin = (Math.abs(lon) - lonDeg) * 60;
		 lonMin = lonMin.toFixed(4);
		 lonMin = lonMin.toString();

	var degStr = "00000" + lonDeg;
	degStr = degStr.substring(degStr.length - 3);

    var minStr = "000" + lonMin;
    	minStr = minStr.substring(minStr.length - 7);


    var lonStr = degStr + minStr;

	var ns = "N";
	if (lat < 0) ns ="S";

	var ew="E";
	if (lon < 0) ew ="W";

	var d = new Date(year, month, day, hour, minute, second, 0);


	var theTime = String("0" + hour).slice(-2);
		theTime += String("0" + minute).slice(-2);
		theTime += String("0" + second).slice(-2);
		theTime += ".000";

	var theDate="";
		theDate += String("0" + day).slice(-2);
		theDate += String("0" + month).slice(-2);//javascript does month 0-11 not 1-12
		theDate += String("0" + year - 2000).slice(-2);

	var fixquality = "1";
	var sats = "08";
	var hordilution = "0.9";
	var altitude1 = altitude * 1.0;
	var altitude2 = altitude * 1.0;

	var retV="";
	retV += "$GPGGA";
	retV += "," + theTime;//timestamp
	retV += "," + latStr;//lat
	retV += "," + ns;// N or S
	retV += "," + lonStr; //lon
	retV += "," + ew;// E or W
	retV += "," + fixquality;
	retV += "," + sats;
	retV += "," + hordilution;
	retV += "," + altitude1;
	retV += "," + "M";
	retV += "," + altitude2;
	retV += "," + "M";
	retV += ",";
	retV += ",";

	checksum = nmeaChecksum(retV.substring(1,retV.length));

	retV += "*" + checksum.toString(16);
	
	return retV;
}

function nmeaChecksum(sentence)
{

	var debugString="";

	var checksum = 0; 
	for(var i = 0; i < sentence.length; i++) 
	{ 
		var oneChar = sentence.charCodeAt(i);
  		checksum = checksum ^ oneChar;
  		var tv = String.fromCharCode(oneChar);
  		debugString += tv;

	}
	return checksum;
}

function degreesPerSecond(speed,radius){
	var degrees = speed / (0.0174533 * radius);
	return degrees;
}

function sendMessageToMissionPlanner(action){
	var frame = document.getElementById('map');
	var message = {action: action, home: home0};
	var home = frame.contentWindow.postMessage(message, '*');
}

handleResponseFromMissionPlanner = function(e) {
	
	var action = e.data.action;
	if(action == 'setHome') {
		homePosition = e.data.home;
		$("#simulator-home-position").text("Home: " +homePosition.x + "," + homePosition.y);
	} else if(action == 'setPath'){
		var mypath = e.data.path;
		var aaa = 0;
	} else {
		console.log("Unknown message: "+e.data);
	}

}
