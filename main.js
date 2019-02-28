/*
 * This file is part of u360gts:
 * https://github.com/raul-ortega/u360gts
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

var debugEnabled = false;

var dataRecieved="";
var connectionId = -1;
var updateCheckBoxesAllowed = false;
var serialReceiving = false;

var cliModeEnabled = false;

var configurationLoaded = false;

var configuration = "";

var cliEnterTimer = 0;

var movingHeading = false;
var movingTilt = false;

var bitrates = [1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 115200];
var features = [
	"VBAT",
    "SERVO_TILT",
	"SOFTSERIAL",
	"GPS",
	"TELEMETRY",
	"DISPLAY",
	"EASING",
	"NOPID",
	"DEBUG",
	"EPS",
	"AUTODETECT"
	];

var commands = {
	calibrate_mag: 1,
	calibrate_mag: 2,
	set: 3,
	set_pan: 4,
	feature: 6,
	backup: 6,
	restore: 7,
	save: 8,
	exit: 9,
	cli_enter: 10,
	heading: 11,
	tilt: 12,
	status:13,
	get_rssi:14,
	get_vbat:15,
	cli_command:16,
	get_serial:17,
	set_serial:18
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

var timer;// call every 1000 milliseconds

var rssiTimer;
var rssiUpdating = false;

var uploadConfigurationTimer;

var connected = false;

var cliHasReplied = false;

var customSimulationEnabled = false;



  $( function() {
    $( ".controlgroup" ).controlgroup()
    $( ".controlgroup-vertical" ).controlgroup({
      "direction": "vertical"
    });
  } );
  
  $(function(){

	if(debugEnabled) enableDisableButtons();

	var handlePan = $("#pan-custom-handle");  
	$("#pan-slider").slider({
		value: 0,
		min: 0,
		max: 360,
		step: 1,
		animate:"slow",
		orientation: "horizontal",
		create: function() {
			handlePan.text($(this).slider("value"));
		},
		slide: function( event, ui ) {
			handlePan.text(ui.value);
			setHeadingPosition(ui.value);
		}
	});
	var handleTilt = $("#tilt-custom-handle");
	$("#tilt-slider").slider({
		value: 0,
		min: 0,
		max: 90,
		step: 1,
		animate:"slow",
		orientation: "horizontal",
		create: function() {
			handleTilt.text($(this).slider("value"));
		},
		slide: function( event, ui ) {
			handleTilt.text(ui.value);
			setTiltPosition(ui.value);
		}
	});
	  
	$("#calibrate_pan").click(function(){
		serialSend(connectionId, str2ab('set pan0_calibrated=0\ncalibrate pan\n'));
		last_sent_command = commands.calibrate_pan;
		setCheckbox("#calibrate_pan","false");
	});

	$("#calibrate_mag").click(function(){
		serialSend(connectionId, str2ab('set mag_calibrated=0\ncalibrate mag\n'));
		last_sent_command = commands.calibrate_mag;
	});

	$("#save").click(function(){
		clearAll();
		serialSend(connectionId, str2ab('save\n'));
		setStatus("Saving and rebooting");
		cliModeEnabled = false;
		configurationLoaded = false;
		$("#backup").prop('disabled',true);
		$("#restore").prop('disabled',true);
		rssiClearInterval();
		enableDisableButtons();
	});
	
	$("#default").click(function(){
		serialSend(connectionId, str2ab('defaults\n'));
	});
	
	$("#enter").click(function(){
		if(connected){
			cliModeEnabled = true;
			cliHasReplied = false;
			sendCliEnterCommands();
			setStatus("Waiting response...");
			timer = setInterval(function(){
				if(last_sent_command == commands.cli_enter && (new Date().getTime() - cliEnterTimer) > 2000) {
					clearInterval(timer);
					cliEnterTimer = 0;
					last_sent_command = commands.set;
					serialSend(connectionId, str2ab('version\nserial\nfeature\nset\n\status\n'));
				}	
			}, 2000); 
			$("#backup").prop('disabled',true);
			$("#restore").prop('disabled',true);
			enableDisableButtons();
		}
	});
	$("#exit").click(function(){
		clearAll();
		serialSend(connectionId, str2ab('exit\n'));
		setStatus("Exiting and rebooting");
		cliModeEnabled = false;
		configurationLoaded = false;
		$("#backup").prop('disabled',true);
		$("#restore").prop('disabled',true);
		rssiClearInterval();
		enableDisableButtons();
	});
	
	$("#boot").click(function(){
		serialSend(connectionId, str2ab('boot mode\n'));
		clearAll();
		chrome.serial.disconnect(connectionId,function(){
			setStatus("Ready to load firware");
			$("#serial-connect").html('Connect');
			disconnectCallBack();
		});
	});
	$("#serial-connect").click(function(){
		if($(this).html() == 'Disconnect'){
			chrome.serial.disconnect(connectionId,function(){
				setStatus("Disconnected");
				disconnectCallBack();
			});
			$(this).html('Connect');
		}
		else {
			openSelectedPort();
		}
	});

	$('#cli-sender').keypress(function(e) {
		if(e.which == 13) {
			var comando = str2ab($('#cli-sender').val() + '\n');
			last_sent_command = commands.cli_command;
			rssiClearInterval();
			serialSend(connectionId,comando);
			$('#cli-sender').val('');
		}
	});
	
	$("#backup").click(function(){
		configuration = '';
		$("#cli-receiver").html('');
		$("#cli-sender").html('');
		configurationLoaded = false;
		rssiClearInterval();
		sendBackupCommands();
	});
	
	$("#restore").click(function(){
		configuration = '';
		$("#cli-receiver").html('');
		$("#cli-sender").html('');
		$("#backup").prop('disabled',true);
		$("#restore").prop('disabled',true);
		configurationLoaded = false;
		rssiClearInterval();
		clearAll();
		restoreConfig();
	});
	
	
	$("[id*='-checkbox']").on( "click", function( event, ui ) {
		if(updateCheckBoxesAllowed == true) {
			var paramId = $(this).attr('id');
			var param = paramId.slice(0, paramId.indexOf("-checkbox"));
			var paramValue;
			if(param == "eps_interpolation" || param == "update_home_by_local_gps" || param == "gps_home_beeper")
				paramValue=($(this).prop('checked') == true)?'ON':'OFF';
			else
				paramValue=($(this).prop('checked') == true)?1:0;
			var comando = str2ab('set ' + param + '=' + paramValue + '\n');
			serialSend(connectionId,comando);
		}
	});
	$("[id*='-feature']").on( "click", function( event, ui ) {
		if(updateCheckBoxesAllowed == true) {
			var paramId = $(this).attr('id');
			var param = paramId.slice(0, paramId.indexOf("-feature"));
			var paramValue = ($(this).prop('checked') == true)?'':'-';
			var comando = str2ab('feature '  + paramValue + param  + '\n');
			serialSend(connectionId, comando);
			if(paramId == "RSSI_ADC-feature"){
				rssiSetInterval();
			}
			if(paramId == "TELEMETRY-feature"){
				enableDisableRelayOptions($(this).prop('checked'));
			}
		}
	});
	
	$("[id*='-select']").on("change",function(){
		var paramId = $(this).attr('id');
		var paramValue = $(this).val();
		if(paramId == "eps-select"){
			if(paramValue == 1)
				$(".eps-mode-2-3").hide();
			else
				$(".eps-mode-2-3").show();
		}
		if(updateCheckBoxesAllowed == true) {
			if(paramId.contains("relay_telemetry")){
				setSerialRelay2(paramId,paramValue);
			} else {
				var param = paramId.slice(0, paramId.indexOf("-select"));
				var comando = str2ab('set '  + param + '=' + paramValue  + '\n');
				serialSend(connectionId, comando);
				if(param.contains('gps_baud') && paramValue == '0')
					paramValue='ON';
				else
					paramValue='OFF';
				var comando = str2ab('set gps_autobaud=' + paramValue  + '\n');
				serialSend(connectionId, comando);				
			}

		}
	});
	
	$("#simulator-speed-slider").slider({
		value: 0,
		min: 0,
		max: 50,
		step: 1,
		animate:"slow",
		orientation: "horizontal",
		slide: function( event, ui ) {
			setSimulationSpeed(ui.value);
		}
	});
	
	$("#simulator-speed").on( "spinchange", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		speed = $(this).val();
	} );
	$("#simulator-speed").on( "spin", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		speed = $(this).val();
	} );
	$("#simulator-distance").on( "spinchange", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		radius = $(this).val();
	} );
	$("#simulator-distance").on( "spin", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		radius = $(this).val();
	} );
	$("#simulator-altitude").on( "spinchange", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		altitude = $(this).val();
	} );
	$("#simulator-altitude").on( "spin", function( event, ui ) {
		if($(this).val() < 0)
			$(this).val(0);
		altitude = $(this).val();
	} );
	
	$("#simulation-type").on("change",function(){
		customSimulationEnabled = ($(this).val() == 3) ? true : false;
		if(customSimulationEnabled){
			$("#simulator-log").hide();
			$("#map").show();
		} else{
			$("#map").hide();
			$("#simulator-log").show();
		}
			
	});

	/*$("[id*='relay_telemetry_']").each(function(selectParam){
		$(this).on("change",function(item){
			var str="";
			$( "select option:selected" ).each(function() {
				str += $( this ).text() + " ";
			});
			//setSerialRelay(item);
		});	
	});*/
	
	$("body").fadeIn();

  });
function disconnectCallBack(){
	onClose();
	cliHasReplied = false;
	configurationLoaded = false;
	rssiClearInterval();
}

function setHeadingPosition(position) {
  last_sent_command = commands.heading;
  var buffer = new ArrayBuffer(1);
  serialSend(connectionId, str2ab('heading ' + position + '\n'));
};
function setTiltPosition(position) {
  last_sent_command = commands.tilt;
  var buffer = new ArrayBuffer(1);
  serialSend(connectionId, str2ab('tilt ' + position + '\n'));
};

function getParam(param) {
  chrome.serial.send(connectionId, str2ab('set ' + param + '\n'), function() {});
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
			if(last_sent_command != commands.backup && last_sent_command != commands.restore && last_sent_command != commands.get_rssi && last_sent_command != commands.get_vbat) {
				$("#cli-receiver").append(line);
			} else if(last_sent_command == commands.backup){
				backupConfig(line);
			} else if(last_sent_command == commands.restore){
				//
			}
			$("#cli-receiver").scrollTop($('#cli-receiver')[0].scrollHeight);
			
			
			switch(last_sent_command) {
				case commands.set:
					if(line.startsWith('# status')){
						$("#backup").prop('disabled',false);
						$("#restore").prop('disabled',false);
						configurationLoaded = true;
						rssiSetInterval();
						break;
					}
					loadSpinners(line);
					loadCheckboxes(line);
					if(line.startsWith('Enabled:')){
						loadFeatures(line);
					}
					loadSelectmenus(line);
					if(line.contains('u360gts')){
						showVersion(line);
						cliHasReplied = true;
						setStatus("CLI mode enabled");
						enableDisableButtons();
						break;
					}
					if(line.startsWith('serial')){
						loadSSerial(line);
					}
					break;
				case commands.get_rssi:
					if(line.startsWith("# rssi:")){
						var rssi = line.split(" ")[3];
						updateRssi(rssi)
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
				case commands.tilt:
					
					break;
				case commands.heading:
					
					break;
				case commands.get_serial:
					/*if(line.startsWith('serial')){
						loadSSerial(line);
					}*/
					break;
				case commands.status:
					if(line.startsWith('# status'))
						cliModeEnabled = true;
					break;
			}

			this.lineBuffer = this.lineBuffer.substr(index + 1);
			
		}
	}
	updateCheckBoxesAllowed = true;
};

function backupConfig(line){
	
	var lineBackup = line.replace(/[\n\r]/g, '');;
	if(line.startsWith('# status')){
		$("#backup").prop('disabled',false);
		$("#restore").prop('disabled',false);
		saveConfigurationFile(configuration);
	} else if(lineBackup.startsWith('#')){
		$("#cli-receiver").append('\n' + line);
		configuration += '\r\n' + lineBackup;
		if(!lineBackup.contains("version"))
			configuration += '\r\n';
	} else if(lineBackup.startsWith('serial')){
		$("#cli-receiver").append(line + '<br/>');
		configuration += lineBackup + '\r\n';
	} else if(lineBackup.startsWith("Enabled:")){
		for(var i=0;i<features.length;i++){
			if(lineBackup.contains(features[i])) {
				$("#cli-receiver").append('feature ' + features[i] + '\n');
				configuration += 'feature ' + features[i] + '\r\n';
			} else {
				$("#cli-receiver").append('feature -' + features[i] + '\n');
				configuration += 'feature -' + features[i] + '\r\n';
			}
		}
		$("#cli-receiver").append('<br/>');
	} else if(!lineBackup.startsWith('Current') && !lineBackup.startsWith('System') && !lineBackup.startsWith('CPU') && !lineBackup.contains('Cycle') && line.length > 2){
		$("#cli-receiver").append('set '+ line.replace(' = ','=') + '<br/>');
		configuration += 'set '+ lineBackup.replace(' = ','=') + '\r\n';
	}
}

function showVersion(data){
	var firmware = getVersionBoardNumberAndDate(data);
	$("#firmware-version").html(firmware);
}

function getVersionBoardNumberAndDate(data){
	var firmware = data.split("/")[1];
	return  firmware;
}
function getVersionNumber(data){
	var firmware = "" + getVersionBoardNumberAndDate(data) + "";
	firmware = firmware.split(' ')[1];
	return  firmware;
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
function sendRSSICommand(){
	last_sent_command = commands.get_rssi;
	serialSend(connectionId, str2ab('rssi\n'));
}

function updateRssi(paramValue){
	$("#rssi-value").html("RSSI: "+ paramValue + "%");
}

function rssiEnabled(){
	return (($("#RSSI_ADC-feature").prop('checked') == true))?true:false;
}

function rssiSetInterval(){
	if(rssiUpdating == false && rssiEnabled() && configurationLoaded == true){
		$("#rssi-value").show();
		rssiTimer = setInterval(function(){
			sendRSSICommand();
			rssiUpdating = true;
		},500);
	} else {
		rssiClearInterval();
	}
		
}

function rssiClearInterval(){
	$("#rssi-value").hide();
	clearInterval(rssiTimer);
	rssiUpdating = false;
}

function serialSend(connectionId,strmsg){
	chrome.serial.send(connectionId,strmsg,function(){
});
}
function loadCheckboxes(data){
	$("[id*='-checkbox']").each(function(){
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-checkbox"));
		if(data.startsWith(param + " = ")) {
			var paramValue = data.getParamValue(param + " = ");
			paramValue = paramValue.replace(/[\s\n\r]/g, '');
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
		if(paramId == "RSSI_ADC-feature")
			rssiSetInterval();
		if(paramId == "TELEMETRY-feature"){
			enableDisableRelayOptions(paramValue);
			$("#relay_telemetry")
		}
	});
	
}
function enableDisableRelayOptions(paramValue){
	if(paramValue == false){
		$("#relay_telemetry .ui-controlgroup-label").hide();
		$("[id*='relay_telemetry_']").hide();
	} else {
		$("#relay_telemetry .ui-controlgroup-label").show();
		$("[id*='relay_telemetry_']").show();
	}
}
function loadSelectmenus(data){
	$("[id*='-select']").each(function(){
		var thisSelect = $(this);
		var paramId = $(this).attr('id');
		var param = paramId.slice(0, paramId.indexOf("-select"));
		if(data.startsWith(param + " = ")) {
			var paramValue = data.getParamValue(param + " = ");
			paramValue = paramValue.replace(/[\s\n\r]/g, '');
			$("#" + paramId + " option").each(function() {
				$(this).attr('selected',false);
				if($(this).val() == paramValue) {
					$(thisSelect).val(paramValue);//$(this).attr('selected', true);
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
	$("[id*='-select']").each(function(){
		$(this).val("");
	});
	$("#cli-receiver").html('');
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

function onOpen(connectionInfo) {
  if (!connectionInfo) {
    setStatus('Could not open');
	$("#serial-connect").attr('Caption','Connect');
	connected = false;
	enableDisableButtons();
    return;
  }
  $(this).attr('caption','Disonnect');
  $("#serial-connect").html('Disconnect');
  connectionId = connectionInfo.connectionId;
  setStatus('Connected');
  /*cliModeEnabled = true;
  sendCliEnterCommands();*/
  enableButtons();
  connected = true;
  enableDisableButtons();
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
		if(baudOption.value == 115200) baudOption.selected = true;
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
	chrome.serial.getDevices(function(ports) {
	buildBaudPicker(bitrates);
	buildPortPicker(ports);
	});
	$( "#tabs" ).tabs();
};

function sendCliEnterCommands(){
	clearAll();
	serialSend(connectionId, str2ab('RRR\n'));
	if(last_sent_command != commands.cli_enter); {
		cliEnterTimer = new Date().getTime();
		last_sent_command = commands.cli_enter
	}
}
function sendBackupCommands(){
	cliModeEnabled = true;
	last_sent_command = commands.backup;
	serialSend(connectionId, str2ab('version\nserial\nfeature\nset\nstatus\n'));
}
function enableButtons(){
	$(":button").each(function(){
		var buttonId = $(this).attr('id');
		if(buttonId != "serial-connect"){
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
	connected = false;
	cliModeEnabled = false;
	enableDisableButtons();
}


function saveConfigurationFileOld(configuration){
	var file = new File([configuration], "u360gts-configuration-backup.txt", {type: "text/plain;charset=utf-8"});
		saveAs(file);
}

function saveConfigurationFile(configuration) {
        var chosenFileEntry = null;

        var accepts = [{
            extensions: ['txt']
        }];

        // generate timestamp for the backup file
        var d = new Date(),
            now = (d.getMonth() + 1) + '.' + d.getDate() + '.' + d.getFullYear() + '.' + d.getHours() + '.' + d.getMinutes();

        // create or load the file
        chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: 'u360gts_config_' + now, accepts: accepts}, function (fileEntry) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!fileEntry) {
                console.log('No file selected, backup aborted.');
                return;
            }

            chosenFileEntry = fileEntry;

            // echo/console log path specified
            chrome.fileSystem.getDisplayPath(chosenFileEntry, function (path) {
                console.log('Backup file path: ' + path);
            });

            // change file entry from read only to read/write
            chrome.fileSystem.getWritableEntry(chosenFileEntry, function (fileEntryWritable) {
                // check if file is writable
                chrome.fileSystem.isWritableEntry(fileEntryWritable, function (isWritable) {
                    if (isWritable) {
                        chosenFileEntry = fileEntryWritable;

                        // crunch the config object
                        var serialized_config_object = configuration; //JSON.stringify(configuration);
                        var blob = new Blob([serialized_config_object], {type: 'text/plain'}); // first parameter for Blob needs to be an array

                        chosenFileEntry.createWriter(function (writer) {
                            writer.onerror = function (e) {
                                console.error(e);
                            };

                            var truncated = false;
                            writer.onwriteend = function () {
                                if (!truncated) {
                                    // onwriteend will be fired again when truncation is finished
                                    truncated = true;
                                    writer.truncate(blob.size);

                                    return;
                                }

                                console.log('Write SUCCESSFUL');
                                if (callback) callback();
                            };

                            writer.write(blob);
                        }, function (e) {
                            console.error(e);
                        });
                    } else {
                        // Something went wrong or file is set to read only and cannot be changed
                        console.log('File appears to be read only, sorry.');
                    }
                });
            });
        });
    }
	
function restoreConfig(callback) {
    var chosenFileEntry = null;

    var accepts = [{
        extensions: ['txt']
    }];

    // load up the file
    chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function (fileEntry) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        if (!fileEntry) {
            console.log('No file selected, restore aborted.');
            return;
        }

        chosenFileEntry = fileEntry;

        // echo/console log path specified
        chrome.fileSystem.getDisplayPath(chosenFileEntry, function (path) {
            console.log('Restore file path: ' + path);
        });

        // read contents into variable
        chosenFileEntry.file(function (file) {
            var reader = new FileReader();

            reader.onprogress = function (e) {
                if (e.total > 1048576) { // 1 MB
                    // dont allow reading files bigger then 1 MB
                    console.log('File limit (1 MB) exceeded, aborting');
                    reader.abort();
                }
            };

            reader.onloadend = function (e) {
                if (e.total != 0 && e.total == e.loaded) {
                    console.log('Read SUCCESSFUL');

                    try { // check if string provided is a valid JSON
                        var configuration = e.target.result;//JSON.parse(e.target.result);
						uploadConfiguration2(configuration);
                    } catch (e) {
                        // data provided != valid json object
                        $("#cli-receiver").html('Data provided not valid, restore aborted.');

                        return;
                    }

                    /*// validate
                    if (typeof generatedBy !== 'undefined' && compareVersions(generatedBy,backupFileMinVersionAccepted)) {
                                                
                        uploadConfiguration(configuration);
                        
                    } else {
                        $('#cli-receiver').html('Configuration file version not accepted, restore aborted.');
                    }*/
                    
                }
            };

            reader.readAsText(file);
        });
    });

    function compareVersions(generated, required) {
        if (generated == undefined) {
            return false;
        }
        return semver.gte(generated, required);
    }
}

function uploadConfiguration2(configuration){
	cliModeEnabled = true;
	last_sent_command = commands.restore;
	var index;
	$("#cli-receiver").append("Restoring configuration:\n");
	uploadConfigurationTimer = setInterval(function(){
		if((index = configuration.indexOf('\n')) >= 0) {
			if(index==0) {
				configuration = configuration.substr(1,configuration.length-1);
			}
			else{
				var line = configuration.substr(0, index + 1);
				line = line.replace(/[\n\r]/g, '');
				if(!line.startsWith("#") && !line == "" && !line.contains("mag_calibrated")){
					if(line.contains("easing_milis"))
						line = line.replace('milis','millis');
					serialSend(connectionId, str2ab(line + '\n'));
					$("#cli-receiver").append(">");	
				}
				configuration = configuration.substr(index + 1);				
			}
		} else {
			clearInterval(uploadConfigurationTimer);
			$("#cli-receiver").append("\nFinished\n\n");
			last_sent_command = commands.set;
			serialSend(connectionId, str2ab('version\nserial\nfeature\nset\n\status\n'));
		}
	},150);
}

function delay(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}
function enableDisableButtons(){
	//Cli
	var display = (!cliModeEnabled && connected)?"inline-block":"none";
	$("#enter").css("display",display);
	$("#enter").button((!connected || (connected && cliModeEnabled))?'disable':'enable');
	var buttonState = ((connected && cliModeEnabled && cliHasReplied))?'enable':'disable';
	
	display = (cliModeEnabled)?"inline-block":"none";
	$("#exit").css("display",display);
	$("#exit").button(buttonState);
	$("#boot").css("display",display);
	$("#boot").button(buttonState);
	$("#default").button(buttonState);
	$("#default").css("display",display);
	$("#save").css("display",display);
	$("#save").button(buttonState);

	display = (cliModeEnabled)?"block":"none";
	$("#liBasicSettings").css("display",display);
	$("#liFeatures").css("display",display);
	$("#liCliMode").css("display",display);
	
	display = (!cliModeEnabled)?"block":"none";
	$("#liSimulator").css("display",display);
	
	//Simulator
	//$("#simulator-start").button((connected && !cliModeEnabled && !simulationStarted)?'enable':'disable');
	//$("#simulator-stop").button((simulationStarted)?'enable':'disable');
	if(connected && !cliModeEnabled && !simulationStarted || debugEnabled)
		$("#simulator-start").show();
	else
		$("#simulator-start").hide();
	
	if(simulationStarted) {
		$("#simulator-stop").show();
		$("#simulation-frequency").prop('disabled',true);
		$("#simulation-protocol").prop('disabled',true);
		$("#simulation-type").prop('disabled',true);
	} else {
		$("#simulator-stop").hide();
		$("#simulation-frequency").prop('disabled',false);
		$("#simulation-protocol").prop('disabled',false);
		$("#simulation-type").prop('disabled',false);
	}
	
	cleanSerials();
}

function sendStatus(){
  last_sent_command = commands.status;
  serialSend(connectionId, str2ab('status\n'));	
}

function sendSerialCommand(){
  last_sent_command = commands.get_serial;
  serialSend(connectionId, str2ab('serial\n'));
}

function loadSSerial(line) {
  var portNumber = line.split(' ')[1];
  var portFunction = Number(line.split(' ')[2]);
  var portProtocol = Number(line.split(' ')[3]);
  var portBaudRate = Number(line.split(' ')[5]);
  var selectPicker = document.getElementById('relay_telemetry_port-select');
  if(portFunction == 0 || portFunction >= 256){
	  var portOption = document.createElement('option');
	  portOption.value = portOption.innerText = portNumber;
	  if (portFunction >= 256) portOption.selected = true;
	  selectPicker.appendChild(portOption);
  }
  if(portFunction >= 256){
	  $("#relay_telemetry_protocol-select option").each(function() {
	   $(this).attr('selected',false);
		 if($(this).val() == portFunction) {
		   $("#relay_telemetry_protocol-select").val(portFunction);//$(this).attr('selected', true);
		 }
	   });
	   $("#relay_telemetry_baud-select option").each(function() {
	   $(this).attr('selected',false);
		 if($(this).val() == portBaudRate) {
		   $("#relay_telemetry_baud-select").val(portBaudRate);//$(this).attr('selected', true);
		 }
	   });
  }
}
function cleanSerials(){
	$("#relay_telemetry_port-select option").remove();
	$("#relay_telemetry_port-select").append(new Option("Select port", "-1"));
	$("#relay_telemetry_port-select option").first().attr('selected',true);
	$("#relay_telemetry_protocols-select option").each(function(protocolOption){
		protocolOption.selected = false;
	});
		$("#relay_telemetry_baud-select option").each(function(baudOption){
		baudOption.selected = false;
	});
}

function setSerialRelay2(paramId,paramValue){
	var portPicker = document.getElementById('relay_telemetry_port-select');
	var selectedPort = portPicker.options[portPicker.selectedIndex].value;
	var protocolPicker = document.getElementById('relay_telemetry_protocol-select');
	var selectedProtocol = protocolPicker.options[protocolPicker.selectedIndex].value;
	var baudPicker = document.getElementById('relay_telemetry_baud-select');
	var selectedBaud = baudPicker.options[baudPicker.selectedIndex].value;
	var defaultBaudRate = "57600";
	var serialCommand = "";
	
	if(paramId.contains("port"))
		selectedPort = paramValue;
	else if(paramId.contains("protocl"))
		selectedProtocol = paramValue;
	else if(paramId.contains("baud"))
		selectedBaud = paramValue;
	
	$("#relay_telemetry_port-select option").each(function(){
		if($(this).val() != "" && selectedProtocol !="" && selectedBaud !=""){
			if(selectedPort == $(this).val())
				serialCommand += buildSerialCommand(selectedPort,selectedProtocol,selectedBaud,selectedBaud,selectedBaud,selectedBaud);
			else
				serialCommand += buildSerialCommand($(this).val(),0,defaultBaudRate,defaultBaudRate,defaultBaudRate,defaultBaudRate);
		}
	});
	if(serialCommand != ""){
		last_sent_command = commands.cli_command;
		serialSend(connectionId, str2ab(serialCommand + "serial\n"));
	}
}

function buildSerialCommand(port,protocol,baud1,baud2,baud3,baud4){
	return "serial " + port + " " + protocol + " " + baud1 + " " + baud2+ " " + baud3+ " " + baud4 + "\n";
}
