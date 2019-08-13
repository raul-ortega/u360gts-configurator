function Data2MFD(distance,altitude,heading,force_error){
	var mfdPacket = "D" + Math.round(distance) + "H" + Math.round(altitude) + "A" + Math.round(heading);
	var checksum = mfdChecksum(mfdPacket.substring(0,mfdPacket.length));
	if(force_error)
		checksum = 255;
	mfdPacket += "*" + checksum;
	return mfdPacket;
}

function mfdChecksum(sentence)
{
	
	var debugString="";

	var checksum = 0; 
	for(var i = 0; i < sentence.length; i++) 
	{ 
		var oneChar = sentence.charCodeAt(i);
  		checksum = checksum + oneChar;
	}
	checksum = checksum % 256;
	return checksum;
}

function setHome2MFD(){
	var mfdPacket = "##########################################################################################################################################################XXXXXX";
	return mfdPacket;
}