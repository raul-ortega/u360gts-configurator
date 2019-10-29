var magic_number = 254;
var seq = -1;

function build_mavlink_msg_gps_raw_int(lat,lon,altitude,ground_speed,force_error){
	var system_id = 100;
	var component_id = 200;
	var timeUsec = 0; //new Date().getTime() * 1000;
	var fixType = $("#simulation-fixtype").val();
	var latitude = lat * 10000000; //474035790;
	var longitude = lon * 10000000; //85358460;
	var altitude = altitude * 1000;
	var eph = 0;
	var epv = 0;
	var vel = ground_speed * 100;
	var cog = 0;
	var satellites = $("#simulation-sats").val();;

	seq++;
	if(seq > 255) seq = 0;

	msg = new mavlink_msg_gps_raw_int(system_id,component_id,seq,timeUsec,fixType,latitude,longitude,altitude,eph,epv,vel,cog,satellites,force_error);
	return msg;	
}
	
mavlink_msg_gps_raw_int = function(system_id, component_id, seq, timeUsec, fixType, latitude, longitude, altitude, eph, epv, vel, cog, satellites, force_error) {

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

	if(force_error)
		crc = 0xab01;
	
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

//uint8_t system_id, uint8_t component_id, mavlink_message_t* msg, uint32_t time_boot_ms, float roll, float pitch, float yaw, float rollspeed, float pitchspeed, float yawspeed
//mavlink_msg_attitude_pack (100, 200, &msg, 0, telemetry_roll, telemetry_pitch, radians(telemetry_course), 0.0, 0.0, 0.0);
function build_mavlink_msg_attitude_pack(roll,pitch,yaw,roll_speed,pitch_speed,yaw_speed,force_error){
	var system_id = 100;
	var component_id = 200;
	var timeMsec = 0; //new Date().getTime() * 1000;
	var roll = 0.0;
	var pitch = 0.0;
	var yaw = course * (Math.PI/180);
	var roll_speed = 0.0;
	var pitch_speed = 0.0;
	var yaw_speed = 0.0;

	seq++;
	if(seq > 255) seq = 0;

	msg = new mavlink_msg_attitude_pack(system_id,component_id,seq,timeMsec,roll,pitch,yaw,roll_speed,pitch_speed,yaw_speed,force_error);
	return msg;		
}

mavlink_msg_attitude_pack = function(system_id,component_id,seq,timeMsec,roll,pitch,yaw,roll_speed,pitch_speed,yaw_speed,force_error) {
	
	var payload_length = 28;
	var crc = 65535;
	var msg_id = 30;
    var crc_extra = 39;
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
	msgBuffer = packToBuffer(numberToBuffer(timeMsec,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(roll,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(pitch,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(yaw,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(roll_speed,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(pitch_speed,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(yaw_speed,4), msgBuffer);

	if(force_error)
		crc = 0xab01;
	
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

function build_mavlink_msg_global_position_int_pack(lat,lon,altitude,course,force_error){
	//uint8_t system_id, uint8_t component_id, mavlink_message_t* msg,uint32_t time_boot_ms, int32_t lat, int32_t lon, int32_t alt, int32_t relative_alt, int16_t vx, int16_t vy, int16_t vz, uint16_t hdg
	//mavlink_msg_global_position_int_pack(100, 200, &msg, 0, targetPosition.lat*10, targetPosition.lon*10, ((int32_t)targetPosition.alt)*1000, ((int32_t)targetPosition.alt)*1000, 0, 0, 0, (uint16_t)telemetry_course);
	var system_id = 100;
	var component_id = 200;
	var timeMsec = 0; //new Date().getTime() * 1000;
	var latitude = lat * 10000000; //474035790;
	var longitude = lon * 10000000; //85358460;
	var altitude = altitude * 1000;
	var relative_alt = altitude * 1000;
	var vx = 0;
	var vy = 0;
	var vz = 0;
	var hdg = 4500; //Math.round(course * 100);

	seq++;
	if(seq > 255) seq = 0;

	msg = new mavlink_msg_global_position_int_pack(system_id,component_id,seq,timeMsec,latitude,longitude,altitude,altitude,vx,vy,vz,hdg,force_error);
	return msg;	
}
	
mavlink_msg_global_position_int_pack = function(system_id,component_id,seq,timeMsec,latitude,longitude,altitude,relative_altitude,vx,vy,vz,hdg,force_error) {
	
	var payload_length = 28;
	var crc = 65535;
	var msg_id = 33; // MSG_ID_GPS_RAW_INT_CRC
    var crc_extra = 104; // MSG_ID_GPS_RAW_INT_CRC
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
	msgBuffer = packToBuffer(numberToBuffer(timeMsec,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(latitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(longitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(altitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(relative_altitude,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(vx,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(vy,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(vz,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(hdg,2), msgBuffer);

	if(force_error)
		crc = 0xab01;
	
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

function build_mavlink_msg_heartbeat_pack(){
	//mavlink_msg_heartbeat_pack (100, 200, &msg, 1, 1, 1, 0, 1);
	var system_id = 100;
	var component_id = 200;
	var custom_mode = 1;
	var type = 1;
	var autopilot = 1;
	var base_mode = 0;
	var system_status = 1;
	var mavlink_version = 3;
	
	seq++;
	if(seq > 255) seq = 0;

	msg = new mavlink_msg_heartbeat_pack(system_id,component_id,custom_mode,type,autopilot,base_mode,system_status,mavlink_version);
	return msg;	
}

mavlink_msg_heartbeat_pack = function(system_id,component_id,custom_mode,type,autopilot,base_mode,system_status,mavlink_version) {

	var payload_length = 9;
	var crc = 65535;
	var msg_id = 0; // MAVLINK_MSG_ID_HEARTBEAT
    var crc_extra = 50; // MAVLINK_MSG_ID_HEARTBEAT
	var header = [magic_number];
	var msgBuffer = [];
	
	msgBuffer = packToBuffer(numberToBuffer(payload_length,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(seq,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(system_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(component_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(msg_id,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(custom_mode,4), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(type,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(autopilot,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(base_mode,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(system_status,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(mavlink_version,1), msgBuffer);

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

