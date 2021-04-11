'use strict';
TABS.configuration = {
    lastCommand: ""
};
TABS.configuration = {
    lastCommandDone: true
};
TABS.configuration.initialize = function (callback) {
    var self = this;
    if (GUI.active_tab != 'configuration') {
        GUI.active_tab = 'configuration';
    }

    $('#content').load("./tabs/configuration.html", function () {
        // translate to user-selected language
        i18n.localizePage();

        // Solicitamos datos
        TABS.configuration.getData();

        // SAVE
        $("#configurationButtonSave").click(function () {
            GTS.save();
			GUI.setLastBaud();
            GUI.reboot();
        });
		
        $('#tilt-slider').on('input', function () {
            $('#tilt-output').val($('#tilt-slider').val());
	    TABS.configuration.moveServo('tilt',$('#tilt-output').val());
        });
        $('#tilt-output').on('input', function () {
            if ($('#tilt-output').val() !== $('#tilt-slider').val()) {
                console.log("Mueve tilt");
                $('#tilt-slider').val($('#tilt-output').val());
		TABS.configuration.moveServo('tilt',$('#tilt-output').val());
            }
        });
	$('#tilt0-spinner').on('input', function () {
	    TABS.configuration.moveServo('tilt',$('#tilt-output').val());
        });
	$('#tilt90-spinner').on('input', function () {
	    TABS.configuration.moveServo('tilt',$('#tilt-output').val());
        });
        $('#pan-slider').on('input', function () {
            $('#pan-output').val($('#pan-slider').val());
	    TABS.configuration.moveServo('heading',$('#pan-output').val());
        });
        $('#pan-output').on('input', function () {
            if ($('#pan-output').val() !== $('#pan-slider').val()) {
                console.log("Mueve pan");
                $('#pan-slider').val($('#pan-output').val());
	        TABS.configuration.moveServo('heading',$('#pan-output').val());
            }
        });
        $("#calibrate_mag").click(function () {
            GUI.calibrate_lock = true;
            self.calibrateMag();
        });
        $("#calibrate_pan").click(function () {
            GUI.calibrate_lock = true;
            self.calibratePan();
        });
        
        GUI.content_ready(callback);
        
    });
};
TABS.configuration.loadData = function (data) {

    $("[id*='-spinner']").each(function () {

        var paramId = $(this).attr('id');
        var param = paramId.slice(0, paramId.indexOf("-spinner"));
        if (data.startsWith(param + " = ")) {

            var paramValue = data.getParamValue(param + " = ");
            $(this).val(paramValue.replace(/(\r\n|\n|\r)/gm, ""));
            $(this).on("change", function (event, ui) {
                GTS.set(param, this.value);
            });
        }

    });
    $("[id*='-select']").each(function () {
        var thisSelect = $(this);
        var paramId = $(this).attr('id');
        var param = paramId.slice(0, paramId.indexOf("-select"));
        if (data.startsWith(param + " = ")) {
            var paramValue = data.getParamValue(param + " = ");
            paramValue = paramValue.replace(/[\s\n\r]/g, '');
            $("#" + paramId + " option").each(function () {
                $(this).attr('selected', false);
                if ($(this).val() === paramValue) {
                    $(thisSelect).val(paramValue);
                }
            });
            $("#" + paramId + " option[value='" + paramValue + "']").attr("selected", true);
            $(this).on("change", function (event, ui) {
                GTS.set(param, this.value);
				if(param == 'telemetry_baud'){
					var baud = $('#' + $(thisSelect).attr('id') + ' :selected').text();
					GUI.connected_baud = baud;
				}
            });
        }

    });
    $("[id*='-checkbox']").each(function () {

        var paramId = $(this).attr('id');
        var param = paramId.slice(0, paramId.indexOf("-checkbox"));
        if (data.startsWith(param + " = ")) {

            var paramValue = data.getParamValue(param + " = ");
            paramValue = paramValue.replace(/[\s\n\r]/g, '');
            paramValue = (paramValue === "ON" || paramValue === "1") ? true : false;
            $("#" + paramId).val(paramValue);
            GUI.switcheries[paramId].setPosition(paramValue);
        }

    });
    // Ejecutamos solo una vez el parseo de los FEATURES
    if (data.contains('Enabled: ')) {

        $("[id*='-feature']").each(function () {

            var paramId = $(this).attr('id');
            var param = paramId.slice(0, paramId.indexOf("-feature"));
            var paramValue = (data.contains(param)) ? true : false;
            $("#" + paramId).val(paramValue);
            GUI.switcheries[paramId].setPosition(paramValue);
        });
    }

    if (data.startsWith('serial') && GUI.active_tab == "settings") {

        // Parseamos linea Serial
        var portNumber = data.split(' ')[1];
        var portFunction = Number(data.split(' ')[2]);
        var portProtocol = Number(data.split(' ')[3]);
        var portBaudRate = Number(data.split(' ')[5]);

        if (portFunction != 1 && portFunction != 2) { // Serial 0 for telemetry, Serial 1 for GPS
			var portName = "serial";
			if(portNumber >=30)
				portName = "softserial";

            GUI.softserial_count++;

            var selectProtocolID = portName + GUI.softserial_count + "-protocol";
            var selectBaudrateID = portName + GUI.softserial_count + "-baudrate";

            // Add port row
            $('#portsTable tr:last').after('<tr>\n\
                                            <td>' + portName + ' ' + portNumber + '</td>\n\
                                            <td>\n\
                                                <select id="' + selectProtocolID + '">\n\
                                                    <option value="0" >Select protocol</option>\n\
                                                    <option value="256">MFD</option>\n\
                                                    <option value="512">MAVLINK</option>\n\
                                                    <option value="1024">NMEA</option>\n\
                                                    <option value="2048">LTM</option>\n\
													<option value="8192">FORWARD</option>\n\
                                                </select>\n\
                                            </td>\n\
                                            <td>\n\
                                                <select id="' + selectBaudrateID + '">\n\
                                                    <option value="0" >Select baudrate</option>\n\
                                                    <option value="1200">1200</option>\n\
                                                    <option value="2400">2400</option>\n\
                                                    <option value="4800">4800</option>\n\
                                                    <option value="9600">9600</option>\n\
                                                    <option value="19200">19200</option>\n\
                                                    <option value="38400">38400</option>\n\
                                                    <option value="57600">57600</option>\n\
                                                    <option value="115200">115200</option>\n\
                                                    <option value="230400">230400</option>\n\
                                                    <option value="250000">250000</option>\n\
                                                </select>\n\
                                            </td>\n\
                                        </tr>');

            $("#" + selectProtocolID + " option[value=" + portFunction + "]").attr('selected', 'selected');
            $("#" + selectBaudrateID + " option[value=" + portBaudRate + "]").attr('selected', 'selected');

            $("#" + selectProtocolID).on('change', function () {
                GTS.setSerial(portNumber, $("#" + selectProtocolID).val(), $("#" + selectBaudrateID).val());
            });

            $("#" + selectBaudrateID).on('change', function () {
                GTS.setSerial(portNumber, $("#" + selectProtocolID).val(), $("#" + selectBaudrateID).val());
            });

        }

        if (!GUI.softserial_count) {
            $("#portsTable").hide();
            $("#notePortsTable").show();
        } else {
            $("#portsTable").show();
            $("#notePortsTable").hide();
        }

    }



};

TABS.configuration.getData = function () {
    TABS.configuration.lastCommand = "set";
    GTS.send("set\nfeature\nserial\nstatus\n");
};

TABS.configuration.switcheryChange = function (elem) {

    var elemID = $(elem).attr('id');
    if (elemID.contains("-checkbox")) {

        var param = elemID.slice(0, elemID.indexOf("-checkbox"));
        if (elemID.contains("mag_calibrated") || elemID.contains("pan0_calibrated")) {

            var ON = "1";
            var OFF = "0";
        } else {

            var ON = "ON";
            var OFF = "OFF";
        }

        if ($(elem).val() === "true") {
            $("#" + elemID).val("false");
            GTS.set(param, OFF);
        } else {
            $("#" + elemID).val("true");
            GTS.set(param, ON);
        }

    }

    if (elemID.contains("-feature")) {

        var param = elemID.slice(0, elemID.indexOf("-feature"));
        if ($(elem).val() === "true") {
            $("#" + elemID).val("false");
            GTS.feature(param, false);
        } else {
            $("#" + elemID).val("true");
            GTS.feature(param, true);
        }

    }

};

TABS.configuration.cleanup = function (callback) {
    console.log("cleanup config");

    GUI.softserial_count = 0;

    if (callback)
        callback();
};

TABS.configuration.calibratePan = function () {
    //TABS.configuration.setCheckBox("mag_calibrated-checkbox", false);
    TABS.configuration.setCheckBox("pan0_calibrated-checkbox", false);
    TABS.configuration.lastCommand = "calibrate pan";
    GUI.log(i18n.getMessage("configurationPanCalibrationStartedLogMessage"));
    GTS.send('calibrate pan\n');
};

TABS.configuration.calibrateMag = function () {
    TABS.configuration.setCheckBox("mag_calibrated-checkbox", false);
    TABS.configuration.lastCommand = "calibrate mag";
    GTS.send('calibrate mag\n');
    GUI.log(i18n.getMessage("configurationMagCalibrationStartedLogMessage"));
    GUI.interval_add("calibratemag_interval", function () {
        TABS.configuration.setCheckBox("mag_calibrated-checkbox", true);
        GUI.interval_remove("calibratemag_interval");
        GUI.log(i18n.getMessage("configurationCalibrationFinishedLogMessage"));
        GUI.calibrate_lock = false;
    }, 12000);
};

TABS.configuration.setCheckBox = function (id, value) {
    $("#" + id).prop("checked", value);//$("#"+id).prop("checked", "" + value + "");
    GUI.switcheries[id].setPosition(false);//$(id).button("refresh");
};

TABS.configuration.getCalibrationStatus = function (line, lookat, paramId, message) {
    var paramValue = line.getParamValue(lookat);
    $("#" + paramId).val(paramValue.replace(/(\r\n|\n|\r)/gm, ""));
    GUI.log(message + " " + paramValue);
}
TABS.configuration.parseCalibratePan = function (line) {
    if (line.contains('min ')) {
        TABS.configuration.getCalibrationStatus(line, "min ", "pan0-spinner", i18n.getMessage("configurationCalibrationMinPulseLogMessage"));
    } else if (line.contains('max ')) {
        TABS.configuration.getCalibrationStatus(line, "max ", "pan0-spinner", i18n.getMessage("configurationCalibrationMaxPulseLogMessage"));
    } else if (line.contains('pan0=')) {
        TABS.configuration.getCalibrationStatus(line, "pan0=", "pan0-spinner", i18n.getMessage("configurationCalibrationPan0PulseLogMessage"));
    } else if (line.contains('min_pan_speed=')) {
        TABS.configuration.getCalibrationStatus(line, "min_pan_speed=", "min_pan_speed-spinner", i18n.getMessage("configurationCalibrationMinPanSpeedLogMessage"));
    } else if (line.contains('pan0_calibrated=0')) {
        TABS.configuration.setCheckBox("pan0_calibrated-checkbox", false);
    } else if (line.contains('pan0_calibrated=1')) {
        TABS.configuration.setCheckBox("mag_calibrated-checkbox", true);
        TABS.configuration.setCheckBox("pan0_calibrated-checkbox", true);
        GUI.log(i18n.getMessage("configurationCalibrationCalibratedLogMessage"));
    } else if (line.contains("has finished")) {
        GUI.log(i18n.getMessage("configurationCalibrationFinishedLogMessage"));
        GUI.calibrate_lock = false;
    }
}

TABS.configuration.moveServo = function(servo,angle){
	if (TABS.configuration.lastCommandDone){
		TABS.configuration.lastCommand = servo;
		TABS.configuration.lastCommandDone = false;
		GTS.send(servo + ' ' + angle + '\n');
	}		
}
