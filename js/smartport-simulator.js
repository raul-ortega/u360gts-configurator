
var seq = -1;

var START_STOP             = 0x7e;
var DATA_FRAME			   = 0x10;
var VFAS_FIRST_ID          = 0x0210;
var VFAS_LAST_ID           = 0x021f;
var ALT_FIRST_ID           = 0x0100;
var ALT_LAST_ID            = 0x010f;
var T2_FIRST_ID            = 0x0410;
var T2_LAST_ID             = 0x041f;
var GPS_LONG_LATI_FIRST_ID = 0x0800;
var GPS_LONG_LATI_LAST_ID  = 0x080f;
var GPS_ALT_FIRST_ID       = 0x0820;
var GPS_ALT_LAST_ID        = 0x082f;
var GPS_SPEED_FIRST_ID     = 0x0830;
var GPS_SPEED_LAST_ID      = 0x083f;
var GPS_COURS_FIRST_ID     = 0x0840;
var GPS_COURS_LAST_ID      = 0x084f;
var GPS_STATUS			   = 0x5002;

function build_smartport_package(header, id, value) {
	

	var msgBuffer = [];
	
	msgBuffer = packToBuffer(numberToBuffer(header,1), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(id,2), msgBuffer);
	msgBuffer = packToBuffer(numberToBuffer(value,4), msgBuffer);

	console.log(msgBuffer);
	var bytes = new Uint8Array(msgBuffer.length+4);
	
	bytes[0] = START_STOP;
	bytes[1] = 0;
	j = 2;

	//msgBuffer[3] = 0;
	//msgBuffer[4] = 2;
	//msgBuffer[5] = 0;
	//msgBuffer[6] = 0;
	
	for (var i = 0; i < msgBuffer.length; ++i) {
		bytes[j] = msgBuffer[i];
		j = j + 1
	}
	
	var crc = 0;
	for(var i = 0; i < msgBuffer.length; i++)
	{
		crc += msgBuffer[i];         //0-1FF
		crc += crc >> 8;   //0-100
		crc &= 0x00ff;
		crc += crc >> 8;   //0-0FF
		crc &= 0x00ff;
	}
	/*if(force_error)
			crc = 0xab01;*/
	bytes[9] = 0xFF - crc;
	bytes[10] = START_STOP;
	
	
	console.log(bytes);
	return bytes;
}

function build_smartport_msg_altitude_pack(altitude){
	msg = new build_smartport_package(DATA_FRAME, GPS_ALT_FIRST_ID, altitude);
	return msg;		
}

// derived from calc_gps_starus function from ardupilot: https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Frsky_Telem/AP_Frsky_SPort_Passthrough.cpp
function build_smartport_msg_gpsstatus_pack(fix_type,satellites,altitude){
	// number of GPS satellites visible (limit to 15 (0xF) since the value is stored on 4 bits)
    var gps_status = satellites;
    // GPS receiver status (limit to 0-3 (0x3) since the value is stored on 2 bits: NO_GPS = 0, NO_FIX = 1, GPS_OK_FIX_2D = 2, GPS_OK_FIX_3D or GPS_OK_FIX_3D_DGPS or GPS_OK_FIX_3D_RTK_FLOAT or GPS_OK_FIX_3D_RTK_FIXED = 3)
    gps_status |= fix_type << 4;
    // GPS horizontal dilution of precision in dm
    gps_status |= 0 << 6;
    // GPS receiver advanced status (0: no advanced fix, 1: GPS_OK_FIX_3D_DGPS, 2: GPS_OK_FIX_3D_RTK_FLOAT, 3: GPS_OK_FIX_3D_RTK_FIXED)
    gps_status |= 3 << 14;
    // Altitude MSL in dm
    gps_status |= prep_number(altitude * 0.1,2,2) << 22;
	
	msg = new build_smartport_package(DATA_FRAME, GPS_STATUS, gps_status);
	return msg;
}

function build_smartport_msg_latlon_pack(index,lat,lon){
	var tmpui;
	if(index == 1) {
        tmpui = Math.abs(lon * 10000000);  // now we have unsigned value and one bit to spare
        tmpui = (tmpui + tmpui / 2) / 25 | 0x80000000;  // 6/100 = 1.5/25, division by power of 2 is fast
			if (lon) tmpui |= 0x40000000;
    } else {
        tmpui = Math.abs(lat * 10000000);  // now we have unsigned value and one bit to spare
        tmpui = (tmpui + tmpui / 2) / 25;  // 6/100 = 1.5/25, division by power of 2 is fast
        if (lat < 0) tmpui |= 0x40000000;
    }
	
	msg = new build_smartport_package(DATA_FRAME, GPS_LONG_LATI_FIRST_ID, tmpui);
	return msg;
}

// derived from prep_number function from ardupilot: https://github.com/ArduPilot/ardupilot/blob/master/libraries/AP_Frsky_Telem/AP_Frsky_SPort_Passthrough.cpp
function prep_number(number, digits,power)
{
    var res = 0;
    var abs_number = Math.abs(number);

    if ((digits == 2) && (power == 1)) { // number encoded on 8 bits: 7 bits for digits + 1 for 10^power
        if (abs_number < 100) {
            res = abs_number<<1;
        } else if (abs_number < 1270) {
            res = (Math.round(abs_number * 0.1)<<1)|0x1;
        } else { // transmit max possible value (0x7F x 10^1 = 1270)
            res = 0xFF;
        }
        if (number < 0) { // if number is negative, add sign bit in front
            res |= 0x1<<8;
        }
    } else if ((digits == 2) && (power == 2)) { // number encoded on 9 bits: 7 bits for digits + 2 for 10^power
        if (abs_number < 100) {
            res = abs_number<<2;
        } else if (abs_number < 1000) {
            res = (Math.round(abs_number * 0.1)<<2)|0x1;
        } else if (abs_number < 10000) {
            res = (Math.round(abs_number * 0.01)<<2)|0x2;
        } else if (abs_number < 127000) {
            res = (Math.round(abs_number * 0.001)<<2)|0x3;
        } else { // transmit max possible value (0x7F x 10^3 = 127000)
            res = 0x1FF;
        }
        if (number < 0) { // if number is negative, add sign bit in front
            res |= 0x1<<9;
        }
    } else if ((digits == 3) && (power == 1)) { // number encoded on 11 bits: 10 bits for digits + 1 for 10^power
        if (abs_number < 1000) {
            res = abs_number<<1;
        } else if (abs_number < 10240) {
            res = (Math.round(abs_number * 0.1)<<1)|0x1;
        } else { // transmit max possible value (0x3FF x 10^1 = 10240)
            res = 0x7FF;
        }
        if (number < 0) { // if number is negative, add sign bit in front
            res |= 0x1<<11;
        }
    } else if ((digits == 3) && (power == 2)) { // number encoded on 12 bits: 10 bits for digits + 2 for 10^power
        if (abs_number < 1000) {
            res = abs_number<<2;
        } else if (abs_number < 10000) {
            res = (Math.round(abs_number * 0.1)<<2)|0x1;
        } else if (abs_number < 100000) {
            res = (Math.round(abs_number * 0.01)<<2)|0x2;
        } else if (abs_number < 1024000) {
            res = (Math.round(abs_number * 0.001)<<2)|0x3;
        } else { // transmit max possible value (0x3FF x 10^3 = 127000)
            res = 0xFFF;
        }
        if (number < 0) { // if number is negative, add sign bit in front
            res |= 0x1<<12;
        }
    }
    return res;
}