var simulatorTimer = 0;
var calculateDistanceTimer = 0;
var speed; // m/s
var radius; // m
var altitude; // m
var distance = 0;
var startTrackingDistance = 0;
var sendHomeTimer = 0;
var simulationStarted = false;
var accDistance = 0;
var countFrames = 0;

$(function(){
	$("#simulator-start").click(function(){
		accDistance = 0;
		speed = $("#simulator-speed").val();
		radius = $("#simulator-distance").val();
		altitude = $("#simulator-altitude").val();
		startDistance = radius;
		simulationStarted = true;
		enableDisableButtons();
		$("#simulator-log").html('');
		var timerInterval = $("#simulation-frequency").val();
	    sendHomeTimer = new Date().getTime();
		var home = new LatLon(47.403583,8.535850);
		var p1 = new LatLon(home.lat,home.lon);
		var directions = {left:1,right:2};
		var direction = directions.right;
		var navDistance = 0;
		//$("#simulator-log").append(p1.lat + ',' +  p1.lon + '\n');
		var NMEAGPGGA = buildGPGGA(p1.lat,p1.lon,altitude);
		$("#simulator-log").append(NMEAGPGGA + '\n');
		simulatorTimer = setInterval(function(){

			if(new Date().getTime() - sendHomeTimer < 5000){
				distance = 0;
				heading = 0;
				p2 = home.destinationPoint(distance, heading);
			} else {
				// Speed
				var varTime = (new Date().getTime() - calculateDistanceTimer);
				if(calculateDistanceTimer == 0)
					varTime = 0;//timerInterval;
				distance = speed * (varTime/1000);
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
							
					}
				}
			}
			
			//$("#simulator-log").append(p2.lat + ',' +  p2.lon + '\n');
			NMEAGPGGA = buildGPGGA(p2.lat,p2.lon,altitude);
			serialSend(connectionId, str2ab(NMEAGPGGA + '\n'));
			countFrames++;
			if(countFrames > 300){
				countFrames = 0;
				$("#simulator-log").html('');
			}countFrames
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
	//var longitude= lonDeg.toString()+ lonMin.toString();

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
		//theDate += ".000";




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

function setSimulationSpeed(value){
	speed = value;
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
	//var longitude= lonDeg.toString()+ lonMin.toString();

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
		//theDate += ".000";

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
	console.log(debugString);
	return checksum;
}
function degreesPerSecond(speed,radius){
	var degrees = speed / (0.0174533 * radius);
	return degrees;
}