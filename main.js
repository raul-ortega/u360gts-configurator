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
	"EPS"
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


  $( function() {
    $( ".controlgroup" ).controlgroup()
    $( ".controlgroup-vertical" ).controlgroup({
      "direction": "vertical"
    });
  } );
  
  $(function(){
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
			last_sent_command = commands.tilt;
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
			last_sent_command = commands.heading;
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
					serialSend(connectionId, str2ab('version\n'));
					serialSend(connectionId, str2ab('serial\n'));
					serialSend(connectionId, str2ab('feature\n'));
					serialSend(connectionId, str2ab('set\n'));
					serialSend(connectionId, str2ab('status\n'));
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
		$("#backup").prop('disabled',true);
		$("#restore").prop('disabled',true);
		enableDisableButtons();
	});
	$("#boot").click(function(){
		serialSend(connectionId, str2ab('boot mode\n'));
		clearAll();
		chrome.serial.disconnect(connectionId,function(){
			onClose;
			setStatus("Ready to load firware");
			cliModeEnabled = false;
			cliHasReplied = false;
			enableDisableButtons();
		});
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
		configuration = '';
		$("#cli-receiver").html('');
		$("#cli-sender").html('');
		sendBackupCommands();
	});
	$("#restore").click(function(){
		configuration = '';
		$("#cli-receiver").html('');
		$("#cli-sender").html('');
		$("#backup").prop('disabled',true);
		$("#restore").prop('disabled',true);
		clearAll();
		restoreConfig();
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
		var paramId = $(this).attr('id');
		var paramVamule = $(this).val();
		if(paramId == "eps-select"){
			if(paramVamule == 1)
				$(".eps-mode-2-3").hide();
			else
				$(".eps-mode-2-3").show();
		}
		if(updateCheckBoxesAllowed == true) {
			var param = paramId.slice(0, paramId.indexOf("-select"));
			var comando = str2ab('set '  + param + '=' + paramVamule  + '\n');
			serialSend(connectionId, comando);	
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
  });

function setHeadingPosition(position) {
  var buffer = new ArrayBuffer(1);
  serialSend(connectionId, str2ab('heading ' + position + '\n'));
};
function setTiltPosition(position) {
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
			if(last_sent_command != commands.backup && last_sent_command != commands.restore) {
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
						break;
					}
					loadSpinners(line);
					loadCheckboxes(line);
					if(line.startsWith('Enabled:')){
						loadFeatures(line);
					}
					loadSelectmenus(line);
					if(line.contains('amv-open360tracker-32bits')){
						showVersion(line);
						cliHasReplied = true;
						setStatus("CLI mode enabled");
						enableDisableButtons();
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
	serialSend(connectionId, str2ab('version\n'));
	serialSend(connectionId, str2ab('serial\n'));
	serialSend(connectionId, str2ab('feature\n'));
	serialSend(connectionId, str2ab('set\n'));
	serialSend(connectionId, str2ab('status\n'));
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
			serialSend(connectionId, str2ab('version\n'));
			serialSend(connectionId, str2ab('serial\n'));
			serialSend(connectionId, str2ab('feature\n'));
			serialSend(connectionId, str2ab('set\n'));
			serialSend(connectionId, str2ab('status\n'));
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
	$("#enter").button((!connected || (connected && cliModeEnabled))?'disable':'enable');
	var buttonState = ((connected && cliModeEnabled && cliHasReplied))?'enable':'disable';
	$("#exit").button(buttonState);
	$("#boot").button(buttonState);
	$("#default").button(buttonState);
	$("#save").button(buttonState);
	
	//Simulator
	//$("#simulator-start").button((connected && !cliModeEnabled && !simulationStarted)?'enable':'disable');
	//$("#simulator-stop").button((simulationStarted)?'enable':'disable');
	if(connected && !cliModeEnabled && !simulationStarted)
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
	
}
function sendStatus(){
 last_sent_command = commands.status;
	serialSend(connectionId, str2ab('status\n'));	
}
