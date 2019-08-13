function Coordina2Pitlab(number,type)
{
	number = number * 60 * 10000;
	if (number < 0)
	{
		number = 0xFFFFFFFF + number + 1;
	}
	var hex = parseInt(number).toString(16).toUpperCase();
	hex = dataToHex(hex);
	return "$" + type + hex.toUpperCase();
}

function Altitude2Pitlab(number)
{
	if (number < 0)
	{
		number = 0xFFFF + number + 1;
	}
	if (number > 65535) number = 65535;

	var hex = parseInt(number).toString(16);
	hex = "0000".substr(0, 4 - hex.length) + hex;
	return "$B00" + hex.toUpperCase() + "00";
}

function Altitude2PitlabOld(number)
{
	if (number < 0)
	{
		number = 0xFFFF + number + 1;
	}
	if (number > 65535) number = 65535;

	var hex = parseInt(number).toString(16);
	hex = "0000".substr(0, 4 - hex.length) + hex;
	return "$B00" + hex.toUpperCase() + "00";
}

function Altitude2Pitlab(number)
{
	if (number < 0)
	{
		number = 0xFFFF + number + 1;
	}
	if (number > 65535) number = 65535;

	var hex = parseInt(number).toString(16);
	hex = "0000".substr(0, 4 - hex.length) + hex;
	return "$K" + hex.toUpperCase() + "0000";
}

function Sats2Pitlab(number)
{
	if(number > 15) number = 15;
	var hex = number.toString(16);
	hex = dataToHex(hex);
	return "$A" + reverseHex(hex.toUpperCase());
}
function dataToHex(data){
	return "00000000".substr(0, 8 - data.length) + data;
}
function reverseHex(hex){
	return hex.substr(6,2) + hex.substr(4,2) + hex.substr(2,2) + hex.substr(0,2);
}

function Data2Pitlab(sats,alt,lat,lon){
	return Sats2Pitlab(sats) + Altitude2Pitlab(alt) + Coordina2Pitlab(lat,"D") + Coordina2Pitlab(lon,"C");
}