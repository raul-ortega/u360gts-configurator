var magic_number = 254;
var seq = -1;
/*$(document).ready(function(){
	var system_id = 100;
	var component_id = 200;
	var seq = 0;
	var timeUsec = 0; //new Date().getTime() * 1000;
	var fixType = 2;
	var latitude = 474035790;
	var longitude = 85358460;
	var altitude = 0;
	var eph = 0;
	var epv = 0;
	var vel = 1000;
	var cog = 0;
	var satellites = 7;
	msg = new mavlink_msg_gps_raw_int(system_id,component_id,seq,timeUsec,fixType,latitude,longitude,altitude,eph,epv,vel,cog,satellites);
	$.each(msg.buffer,function(e){
		$("body").append('<p>' + msg.buffer[e] + '</p>')
	});
})*/

function build_mavlink_msg_gps_raw_int(lat,lon,altitude){
	var system_id = 100;
	var component_id = 200;
	var timeUsec = 0; //new Date().getTime() * 1000;
	var fixType = $("#simulation-fixtype").val();
	var latitude = lat * 10000000; //474035790;
	var longitude = lon * 10000000; //85358460;
	var altitude = altitude * 1000;
	var eph = 0;
	var epv = 0;
	var vel = 1000;
	var cog = 0;
	var satellites = $("#simulation-sats").val();;

	seq++;
	if(seq > 255) seq = 0;

	msg = new mavlink_msg_gps_raw_int(system_id,component_id,seq,timeUsec,fixType,latitude,longitude,altitude,eph,epv,vel,cog,satellites);
	return msg;	
}
	
mavlink_msg_gps_raw_int = function(system_id, component_id, seq, timeUsec, fixType, latitude, longitude, altitude, eph, epv, vel, cog, satellites, msgBuffer) {

	var payload_length = 30;
	var crc = 65535;
	var msg_id = 24; // MSG_ID_GPS_RAW_INT_CRC
    var crc_extra = 24; // MSG_ID_GPS_RAW_INT_CRC
	var header = [magic_number];
	var msgBuffer = [];
	var msgIndex = 0;

	var tmp = "";
	var msgIndex = 0;
	
	msgBuffer = packToBuffer(numberToBuffer(payload_length,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(seq,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(system_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(component_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(msg_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(timeUsec,8), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(latitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(longitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(altitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(eph,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(epv,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(vel,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(cog,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(fixType,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(satellites,1), msgBuffer);

	crc = calculateCRC(msgBuffer,crc)
	crc = calculateCRC([crc_extra],crc)
	
	msgBuffer = packToBuffer(numberToBuffer(crc,2), msgBuffer);
	
	msgBuffer = header.concat(msgBuffer);

	var bytes = new Uint8Array(msgBuffer.length);
	for (var i = 0; i < msgBuffer.length; ++i) {
		bytes[i] = msgBuffer[i];
	}
	return bytes;
}

function numberToBuffer(number,byteslenght){
	    var bytes = [];
	    var i = byteslenght;
	    do {
		    bytes[--i] = number & (255);
		    number = number >> 8;
	    } while (i)
	    return bytes;
}

function packToBuffer(bufferIn,bufferOut){
	var packet = "";
	var index = bufferOut.length;
	c = 0;
	for(i = 0;i < bufferIn.length;i++){
		bufferOut[index] = bufferIn[bufferIn.length - i - 1];
		index++;
	}
	return bufferOut;
}

function calculateCRC(buffer, crc) {
    var bytes = buffer;
    var crcAccum = crc || 0xffff;
	var tmp;
    $.each(bytes, function(e) {
		tmp = bytes[e] ^ (crcAccum & 0xff);
		tmp ^= (tmp << 4) & 0xff;
		crcAccum = (crcAccum >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4);
		crcAccum = crcAccum & 0xffff;
    });
    return crcAccum;
}

