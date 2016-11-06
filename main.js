/*
 * This file is part of u360gts, aka amv-open360tracker 32bits:
 * https://github.com/raul-ortega/amv-open360tracker-32bits
 *
 * u360gts is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * u360gts is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with u360gts.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var dataRecieved="";
var connectionId = -1;
var updateCheckBoxesAllowed = false;
var serialReceiving = false;

var cliModeEnabled = false;

var bitrates = [1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 115200];

var commands = {
	calibrate_mag: 1,
	calibrate_mag: 2,
	set: 3,
	set_pan: 4,
	feature: 6,
	backup: 6,
	save: 7,
	exit: 8
};
String.prototype.contains = function(param) 
{ 
   return this.indexOf(param) != -1; 
};
String.prototype.getParamValue = function(parser) {
	var value = this.substr(this.indexOf(parser) + parser.length)
	return value;
}


var last_sent_command;



  $( function() {
    $( ".controlgroup" ).controlgroup()
    $( ".controlgroup-vertical" ).controlgroup({
      "direction": "vertical"
    });
  } );
  
  $(function(){
	  
	$("#pan-slider").slider({
		value: 0,
		min: 0,
		max: 360,
		step: 1,
		animate:"slow",
		orientation: "horizontal",
		slide: function( event, ui ) {
			setHeadingPosition(ui.value);
		}
   });
	$("#tilt-slider").slider({
		value: 0,
		min: 0,
		max: 90,
		step: 1,
		animate:"slow",
		orientation: "horizontal",
		slide: function( event, ui ) {
			setTiltPosition(ui.value);
		}
	});
	  
	$("#calibrate_pan").click(function(){
		serialSend(connectionId, str2ab('set pan0_calibrated=0\r\ncalibrate pan\r\n'));
		last_sent_command = commands.calibrate_pan;
		setCheckbox("#calibrate_pan","false");
	});

	$("#calibrate_mag").click(function(){
		serialSend(connectionId, str2ab('set mag_calibrated=0\r\ncalibrate mag\r\n'));
		last_sent_command = commands.calibrate_mag;
	});

	$("#save").click(function(){
		clearAll();
		serialSend(connectionId, str2ab('save\n'));
		setStatus("Saving and rebooting");
		cliModeEnabled = true;
	});
	$("#default").click(function(){
		serialSend(connectionId, str2ab('defaults\n'));
		//setStatus("Default configuration loaded");
	});
	$("#enter").click(function(){
		sendCliEnterCommands();
		cliModeEnabled = true;
	});
	$("#exit").click(function(){
		clearAll();
		serialSend(connectionId, str2ab('exit\n'));
		setStatus("Exiting and rebooting");
		cliModeEnabled = false;
	});
	$("#boot").click(function(){
		serialSend(connectionId, str2ab('boot mode\n'));
		clearAll();
		chrome.serial.disconnect(connectionId,function(){onClose;setStatus("Ready to load firware");});
		cliModeEnabled = false;
	});
	$("#serial-connect").click(function(){
		if($(this).html() == 'Disconnect'){
			chrome.serial.disconnect(connectionId,function(){setStatus("Disconnected");onClose();});
			$(this).html('Connect');
		}
		else {
			openSelectedPort();
		}
	});

	$('#cli-sender').keypress(function(e) {
		if(e.which == 13) {
			var comando = str2ab($('#cli-sender').val() + '\n');
			serialSend(connectionId,comando);
			$('#cli-sender').val('');
		}
	});
	
	$("#backup").click(function(){
		//Open File
		
		//Send commands
		sendBackupCommands();
		
		// Loop while recieveing
	});
	
	$("[id*='-checkbox']").on( "click", function( event, ui ) {
		if(updateCheckBoxesAllowed == true) {
			var paramId = $(this).attr('id');
			var param = paramId.slice(0, paramId.indexOf("-checkbox"));
			var paramVamule;
			if(param == "eps_interpolation" || param == "update_home_by_local_gps")
				paramVamule=($(this).prop('checked') == true)?'ON':'OFF';
			else
				paramVamule=($(this).prop('checked') == true)?1:0;
			var comando = str2ab('set ' + param + '=' + paramVamule + '\n');
			serialSend(connectionId,comando);
			//console.log($(this).prop('checked') + " " + paramVamule);
		}
	});
	$("[id*='-feature']").on( "click", function( event, ui ) {
		if(updateCheckBoxesAllowed == true) {
			var paramId = $(this).attr('id');
			var param = paramId.slice(0, paramId.indexOf("-feature"));
			var paramVamule = ($(this).prop('checked') == true)?'':'-';
			var comando = str2ab('feature '  + paramVamule + param  + '\n');
			serialSend(connectionId, comando);
		}
	});
	$("[id*='-select']").on("change",function(){
		if(updateCheckBoxesAllowed == true) {
			var paramId = $(this).attr('id');
			var param = paramId.slice(0, paramId.indexOf("-select"));
			var paramVamule = $(this).val();
			var comando = str2ab('set '  + param + '=' + paramVamule  + '\n');
			serialSend(connectionId, comando);	
		}
	});
  });

function setHeadingPosition(position) {
  var buffer = new ArrayBuffer(1);
  serialSend(connectionId, str2ab('heading ' + position + '\r\n'));
};
function setTiltPosition(position) {
  var buffer = new ArrayBuffer(1);
  serialSend(connectionId, str2ab('tilt ' + position + '\r\n'));
};

function getParam(param) {
  chrome.serial.send(connectionId, str2ab('set ' + param + '\r\n'), function() {});
};

function onReceive(receiveInfo) {
  updateCheckBoxesAllowed = false;
  if (receiveInfo.connectionId !== connectionId){
	  updateCheckBoxesAllowed = true;
    return;
  }
	serialReceiving = true;
	this.lineBuffer += ab2str(receiveInfo.data);
	
	var index;
	
	if(cliModeEnabled == false){
		while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
			var line = this.lineBuffer.substr(0, index + 1);
			$("#log-receiver").append(line+'<br/>');
			$("#log-receiver").scrollTop($('#log-receiver')[0].scrollHeight);
			var message = {
				action: 'center',
				line: line
			};
			var frame = document.getElementById('map');
			frame.contentWindow.postMessage(message, '*');			
			this.lineBuffer = this.lineBuffer.substr(index + 1);
		}
	}
	else {
		
		
		while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
			var line = this.lineBuffer.substr(0, index + 1);
			if(last_sent_command != commands.backup) {
				$("#cli-reciever").append(line+'<br/>');
				$("#cli-reciever").scrollTop($('#cli-reciever')[0].scrollHeight);			
			} else {
				backupToFile(line);
			}
			//console.log(line);
			switch(last_sent_command) {
				case commands.set:
					loadSpinners(line);
					loadCheckboxes(line);
					if(line.startsWith('Enabled:')){
						loadFeatures(line);
					}
					loadSelectmenus(line);
					if(line.contains('amv-open360tracker-32bits')){
						showVersion(line);
					}
					break;
				case commands.calibrate_pan:
					if(line.contains('min ')){
						$("#pan0-spinner").val(line.getParamValue("min "));
					} else if(line.contains('max ')){
						$("#pan0-spinner").val(line.getParamValue("max "));
					} else if(line.contains('pan0=')){
						$("#pan0-spinner").val(line.getParamValue("pan0="));
					} else if(line.contains('min_pan_speed=')){
						$("#min_pan_speed-spinner").val(line.getParamValue("min_pan_speed="));
					} else if(line.contains('pan0_calibrated=')){
						$("#pan0_calibrated").attr('checked', true);
					}
					break;
				case commands.feature:
					if(line.startsWith('Enabled:')){
						loadFeatures(line);
					}
					break;
					
			}

			this.lineBuffer = this.lineBuffer.substr(index + 1);
			
		}
	}
	updateCheckBoxesAllowed = true;
	
};

function showVersion(data){
	var firmware = data.split("/")[1];
	$("#firmware-version").html(firmware);
	console.log(firmware);
}

function loadSpinners(data){
	$("[id*='-spinner']").each(function(){
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-spinner"));
		if(data.startsWith(param + " = ")) {
			var paramValue = data.getParamValue(param + " = ");
			$(this).val(paramValue);
			$(this).on( "spinchange", function( event, ui ) {
				serialSend(connectionId, str2ab('set ' + param + '=' + this.value + '\n'));
			} );
			$(this).on( "spin", function( event, ui ) {
				serialSend(connectionId, str2ab('set ' + param + '=' + this.value + '\n'));
			} );
		}
	
	});
}

function serialSend(connectionId,strmsg){
	chrome.serial.send(connectionId,strmsg,function(){
		//setInterval(function(){$("#cli-reciever").change();}, 500) 
	});
}
function loadCheckboxes(data){
	$("[id*='-checkbox']").each(function(){
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-checkbox"));
		if(data.startsWith(param + " = ")) {
			var paramValue = data.getParamValue(param + " = ");
			paramValue = paramValue.replace(/[\s\n\r]/g, '');
			console.log(param + ": " + data.substr(data.indexOf(param + " = ") + param.length) + " vs " + paramValue);
			paramValue = (paramValue == "ON" || paramValue == "1" )?true:false;
			setCheckbox("#" + paramId,paramValue);
		}
	})
}

function loadFeatures(data){
	$("[id*='-feature']").each(function(){
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-feature"));
		var paramValue = (data.contains(param))?true:false;
		setCheckbox("#" + paramId,paramValue);
	})
}

function loadSelectmenus(data){
	$("[id*='-select']").each(function(){
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-select"));
		if(data.startsWith(param + " = ")) {
			var paramValue = data.getParamValue(param + " = ");
			paramValue = paramValue.replace(/[\s\n\r]/g, '');
			$("#" + paramId + " option").each(function() {
				$(this).attr('selected',false);
				if($(this).val() == paramValue) {
					$(this).attr('selected', true);
				}
			});
			$("#" + paramId + " option[value='"+ paramValue + "']").attr("selected", true);
		}
	})
}

function clearAll(){
	updateCheckBoxesAllowed = false;
	$("[id*='-checkbox']").each(function(){
		var paramId = "#" + $(this).attr('id');
		setCheckbox(paramId,false);
	});
	$("[id*='-feature']").each(function(){
		var paramId = "#" + $(this).attr('id');
		setCheckbox(paramId,false);
	});
	$("[id*='-spinner']").each(function(){
		$(this).val('0');
	});
	$("#firmware-version").html('unknown');
	updateCheckBoxesAllowed = true;
}

function setCheckbox(id,value){
	$(id).prop("checked", value);
	$(id).button("refresh");
}
function onError(errorInfo) {
  console.warn("Receive error on serial connection: " + errorInfo.error);
};

chrome.serial.onReceive.addListener(onReceive);
chrome.serial.onReceiveError.addListener(onError);
/*chrome.serial.onReadLine.addListener(function (line) {
    //Serial port data recieve event.
    dataRecieved = dataRecieved +line;
});*/



function onOpen(connectionInfo) {
  if (!connectionInfo) {
    setStatus('Could not open');
	$("#serial-connect").attr('Caption','Connect');
    return;
  }
  $(this).attr('caption','Disonnect');
  $("#serial-connect").html('Disconnect');
  connectionId = connectionInfo.connectionId;
  setStatus('Connected');
  sendCliEnterCommands();
  enableButtons();
  //setPosition(0);
};

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function buildPortPicker(ports) {
  var eligiblePorts = ports.filter(function(port) {
    return !port.path.match(/[Bb]luetooth/);
  });

  var portPicker = document.getElementById('port-picker');
  eligiblePorts.forEach(function(port) {
    var portOption = document.createElement('option');
    portOption.value = portOption.innerText = port.path;
    portPicker.appendChild(portOption);
  });
  portOption = document.createElement('option');
  portOption.value = portOption.innerText = '/dev/ttyS98';
  portPicker.appendChild(portOption);
  

  /*portPicker.onchange = function() {
    if (connectionId != -1) {
      chrome.serial.disconnect(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  };*/
}

function buildBaudPicker(bitrates){
	var baudPicker = document.getElementById('baud-picker');
	bitrates.forEach(function(bitrate) {
		var baudOption = document.createElement('option');
		baudOption.value = baudOption.innerText = bitrate;
		baudPicker.appendChild(baudOption);
	});
}
var str2ab = function(str) {
  var encodedString = unescape(encodeURIComponent(str));
  var bytes = new Uint8Array(encodedString.length);
  for (var i = 0; i < encodedString.length; ++i) {
    bytes[i] = encodedString.charCodeAt(i);
  }
  return bytes.buffer;
};

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function openSelectedPort() {
	var portPicker = document.getElementById('port-picker');
	var selectedPort = portPicker.options[portPicker.selectedIndex].value;
	var baudPicker = document.getElementById('baud-picker');
	var selectedBitrate = baudPicker.options[baudPicker.selectedIndex].value;
	var bitrate = parseInt(selectedBitrate,10);
	chrome.serial.connect(selectedPort,{bitrate:bitrate},onOpen);
}

onload = function() {
	window.resizeTo(1100,1170);
	window.moveTo(0,0); 

	/*document.getElementById('position-input').onchange = function() {
		setPosition(parseInt(this.value));
	};*/
	


	chrome.serial.getDevices(function(ports) {
	buildBaudPicker(bitrates);
	buildPortPicker(ports);
	//openSelectedPort();
	});
	$( "#tabs" ).tabs();
};
function sendCliEnterCommands(){
	clearAll();
	serialSend(connectionId, str2ab('RRR\r\n'));
	serialSend(connectionId, str2ab('version\r\n'));
	serialSend(connectionId, str2ab('serial\r\n'));
	serialSend(connectionId, str2ab('feature\r\n'));
	serialSend(connectionId, str2ab('set\r\n'));
	last_sent_command=commands.set;
}
function sendBackupCommands(){
	last_sent_command = commands.backup;
	serialSend(connectionId, str2ab('version\r\n'));
	serialSend(connectionId, str2ab('feature\r\n'));
	serialSend(connectionId, str2ab('feature\r\n'));
	serialSend(connectionId, str2ab('set\r\n'));
}
function enableButtons(){
	$(":button").each(function(){
		if($(this).attr('id') != "serial-connect"){
			$(this).attr('disabled',false);
		}
	});
}
function disableButtons(){
	$(":button").each(function(){
		if($(this).attr('id') != "serial-connect"){
			$(this).prop('disabled',true);
		}
	});
}
function onClose(){
	clearAll();
	//disableButtons();
}