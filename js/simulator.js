var simulatorTimer = 0;
var calculateDistanceTimer = 0;
var radius; // m
var altitude; // m
var distance;
var startDistance = 0;
var sendHomeTimer = 0;
var simulationStarted = false;
var accDistance = 0;
var countFrames = 0;
var protocol = 2;
var home0 = [0, 0];
var homePosition;
var lastPoint;
var course;
var protocol;
var protocols = {
    NMEA: 1,
    MAVLINK: 2,
    PITLAB: 3,
    MFD: 4
};
var nmeaPackets = {
    gga: 1,
    rmc: 2
};
var lastNmeaPacket = nmeaPackets.rmc;

function Speed(value) {
    var speed = (value / 3600) * 1000;
    return speed
}

function showPacket(packet) {
    countFrames++;
    if (countFrames > 300) {
        countFrames = 0;
        $("#simulator-log").html('');
    }
    $("#simulator-log").append(packet + '\n');
    $(".window").scrollTop($('#simulator-log')[0].scrollHeight);
    
}

function buildPacket(lat, lon, altitude, distance, heading) {
    var packet;
    var forceError = $("#simulator-force-error").prop('checked');
    
    if (protocol == protocols.NMEA) {
        
        packet = (lastNmeaPacket == nmeaPackets.gga) ? buildGPRMC(lat, lon, altitude, course, forceError) : buildGPGGA(lat, lon, altitude, forceError);
        lastNmeaPacket = (lastNmeaPacket == nmeaPackets.gga) ? nmeaPackets.rmc : nmeaPackets.gga;
        if (!debugEnabled)
			GTS.send(packet + '\n');
    } else if (protocol == protocols.MAVLINK) {
        packet = build_mavlink_msg_gps_raw_int(lat, lon, altitude, Speed($("#simulator-speed").val()), forceError);
        GTS.send(String.fromCharCode.apply(null, new Uint8Array(packet)) + '\n');
        if (!debugEnabled)
            GTS.send('\n');
    } else if (protocol == protocols.PITLAB) {
        packet = Data2Pitlab(11, altitude, lat, lon);
        if (!debugEnabled)
            GTS.send(packet + '\n');
    } else if (protocol == protocols.MFD) {
        packet = Data2MFD(distance, altitude, heading, forceError);
        if (!debugEnabled)
            GTS.send(packet + '\n');
    }
    return packet;
}

function buildGPRMC(lat, lon, altitude, course)
{
    var dateObj = new Date();

    var year = dateObj.getUTCFullYear();
    var month = dateObj.getUTCMonth() + 1;
    var day = dateObj.getUTCDate();

    var hour = dateObj.getUTCHours();
    var minute = dateObj.getUTCMinutes();
    var second = dateObj.getSeconds();

    var latDeg = Math.floor(Math.abs(lat));
    var latMin = (Math.abs(lat) - latDeg) * 60;
    latMin = latMin.toFixed(4);
    latMin = latMin.toString();

    var degStr = "00000" + latDeg;
    degStr = degStr.substring(degStr.length - 2);

    var minStr = "000" + latMin;
    minStr = minStr.substring(minStr.length - 7);

    var latStr = degStr + minStr;

    var lonDeg = Math.floor(Math.abs(lon));
    var lonMin = (Math.abs(lon) - lonDeg) * 60;
    lonMin = lonMin.toFixed(4);
    lonMin = lonMin.toString();

    var degStr = "00000" + lonDeg;
    degStr = degStr.substring(degStr.length - 3);

    var minStr = "000" + lonMin;
    minStr = minStr.substring(minStr.length - 7);


    var lonStr = degStr + minStr;

    var ns = "N";
    if (lat < 0)
        ns = "S";

    var ew = "E";
    if (lon < 0)
        ew = "W";

    var d = new Date(year, month, day, hour, minute, second, 0);


    var theTime = String("0" + hour).slice(-2);
    theTime += String("0" + minute).slice(-2);
    theTime += String("0" + second).slice(-2);
    theTime += ".000";

    var theDate = "";
    theDate += String("0" + day).slice(-2);
    theDate += String("0" + month).slice(-2); //javascript does month 0-11 not 1-12
    theDate += String("0" + year - 2000).slice(-2);

    var retV = "";
    retV += "$GPRMC";
    retV += "," + theTime;//timestamp
    retV += ",A";//valid 
    retV += "," + latStr;//lat
    retV += "," + ns;// N or S
    retV += "," + lonStr; //lon
    retV += "," + ew;// E or W
    retV += ",0.0";//speed in Knots
    retV += "," + course;//course
    retV += "," + theDate;//date
    retV += ",0.0";// magnetic variation
    retV += ",W*";//magnetic variation E or W

    checksum = nmeaChecksum(retV.substring(1, retV.length - 1));

    retV += "" + checksum.toString(16);

    return retV;
}

function buildGPGGA(lat, lon, altitude, force_error)
{
    var dateObj = new Date();

    var year = dateObj.getUTCFullYear();
    var month = dateObj.getUTCMonth() + 1;
    var day = dateObj.getUTCDate();

    var hour = dateObj.getUTCHours();
    var minute = dateObj.getUTCMinutes();
    var second = dateObj.getSeconds();

    var latDeg = Math.floor(Math.abs(lat));
    var latMin = (Math.abs(lat) - latDeg) * 60;
    latMin = latMin.toFixed(4);
    latMin = latMin.toString();

    var degStr = "00000" + latDeg;
    degStr = degStr.substring(degStr.length - 2);

    var minStr = "000" + latMin;
    minStr = minStr.substring(minStr.length - 7);

    var latStr = degStr + minStr;

    var lonDeg = Math.floor(Math.abs(lon));
    var lonMin = (Math.abs(lon) - lonDeg) * 60;
    lonMin = lonMin.toFixed(4);
    lonMin = lonMin.toString();

    var degStr = "00000" + lonDeg;
    degStr = degStr.substring(degStr.length - 3);

    var minStr = "000" + lonMin;
    minStr = minStr.substring(minStr.length - 7);


    var lonStr = degStr + minStr;

    var ns = "N";
    if (lat < 0)
        ns = "S";

    var ew = "E";
    if (lon < 0)
        ew = "W";

    var d = new Date(year, month, day, hour, minute, second, 0);


    var theTime = String("0" + hour).slice(-2);
    theTime += String("0" + minute).slice(-2);
    theTime += String("0" + second).slice(-2);
    theTime += ".000";

    var theDate = "";
    theDate += String("0" + day).slice(-2);
    theDate += String("0" + month).slice(-2);//javascript does month 0-11 not 1-12
    theDate += String("0" + year - 2000).slice(-2);

    var fixquality = $("#simulation-fixtype").val();
    var sats = $("#simulation-sats").val();
    var hordilution = "0.9";
    var altitude1 = altitude * 1.0;
    var altitude2 = altitude * 1.0;

    var retV = "";
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

    checksum = nmeaChecksum(retV.substring(1, retV.length));

    if (force_error)
        checksum = 0xff;

    retV += "*" + checksum.toString(16);

    return retV;
}

function nmeaChecksum(sentence)
{

    var debugString = "";

    var checksum = 0;
    for (var i = 0; i < sentence.length; i++)
    {
        var oneChar = sentence.charCodeAt(i);
        checksum = checksum ^ oneChar;
        var tv = String.fromCharCode(oneChar);
        debugString += tv;

    }
    return checksum;
}

function degreesPerSecond(speed, radius) {
    var degrees = speed / (0.0174533 * radius);
    return degrees;
}

function sendMessageToMissionPlanner(action) {
    var frame = document.getElementById('map');
    var message = {action: action, home: home0};
    var home = frame.contentWindow.postMessage(message, '*');
}

handleResponseFromMissionPlanner = function (e) {

    var action = e.data.action;
    if (action == 'setHome') {
        homePosition = e.data.home;
        $("#simulator-home-position").text("Home: " + homePosition.x + "," + homePosition.y);
    } else if (action == 'setPath') {
        var mypath = e.data.path;
        var aaa = 0;
    } else {
        console.log("Unknown message: " + e.data);
    }

}