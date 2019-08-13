var GTS = {
    last_received_timestamp: null,
    read: function (readInfo) {

        this.lineBuffer += String.fromCharCode.apply(null, new Uint8Array(readInfo.data));

        var index;

        while ((index = this.lineBuffer.indexOf('\n')) >= 0) {

            var line = this.lineBuffer.substr(0, index + 1);
            var showOnConsole = true;



            // ------- DIRECCIONAMOS LOS MSG ----------- //

            // Welcome msg from cli entering
            if (line.contains('Entering')) {
                CONFIGURATOR.connectionValid = true;
                TABS.cli.cli_enter_msg = line;
                GTS.send("version\n");
            }

            // Si recivimos versión
            if (line.contains('u360gts') || line.contains('amv-open360tracker')) {

                GUI.log(line);

            }
            // Update Status array
            if (line.contains('# status')) {
                showOnConsole = false;
            }
			if (line.contains('System Uptime')) {
				GUI.status['uptime'] = parseStatus(line,"Uptime",": ")[0].replace(/^\s+|\s+$/g, '');
				showOnConsole = false;
			}
			if (line.contains('Voltage')) {
				GUI.status['vbat'] = parseStatus(line,"Voltage",": ")[0].replace(/^\s+|\s+$/g, '');
				showOnConsole = false;
			}
            if (line.contains('CPU Clock')) {
                GUI.status['cpu'] = parseStatus(line,"CPU Clock","=")[0];
                showOnConsole = false;
            }
            if (line.contains('MAG')) {
                GUI.status['mag'] =  parseStatus(line,"MAG","=")[0];
                showOnConsole = false;
            }
            if (line.contains('GPS')) {
                GUI.status['gps'] =  parseStatus(line,"GPS","=")[0];
                showOnConsole = false;
            }
			if (line.contains('Cycle Time')) {
                GUI.status['cycle'] =  parseStatus(line,"Time",":")[0];
				GUI.status['i2c'] =  parseStatus(line,"Errors",":")[0];
				GUI.status['config'] =  parseStatus(line,"size",":")[0];
                showOnConsole = false;
            }

            // Acciones al recibir estando en la pestaña Configuration o Settings
            if (GUI.active_tab === 'configuration' || GUI.active_tab === 'settings') {

                switch (TABS.configuration.lastCommand) {

                    case "set":
                        TABS.configuration.loadData(line);
                        break;

                    case "calibrate pan":
                        TABS.configuration.parseCalibratePan(line);
                        break;

                    case "calibrate mag":
                        if (line.contains("Calibration finished")) {
                            TABS.configuration.setCheckBox("mag_calibrated-checkbox", true);
                            GUI.log(i18n.getMessage("configurationCalibrationFinishedMessage"));
                            GUI.calibrate_lock = false;
                        }
                        break;
					case "tilt":
					case "heading":
						if (!line.startsWith("#"))
							TABS.configuration.lastCommandDone = true;
					break;
                }
            }

            // ------- --------------------- ----------- //

            this.lineBuffer = this.lineBuffer.substr(index + 1);

            if (showOnConsole && line.length > 2) {
                console.log("<<: " + line);
            }

            showOnLog = true;
        }



        this.last_received_timestamp = Date.now();

    },
    send: function (line, callback, showOnConsole) {

        var bufferOut = new ArrayBuffer(line.length);
        var bufView = new Uint8Array(bufferOut);

        for (var c_key = 0; c_key < line.length; c_key++) {
            bufView[c_key] = line.charCodeAt(c_key);
        }

        if (!line.contains("status")) {
            console.log(">>: " + line);
        }

        serial.send(bufferOut, callback);

    },
    set: function (param, value) {

        var command = 'set ' + param + ' = ' + value + '\n';

        console.log(command);
        this.send(command);

    },
    save: function () {

        this.send("save\n");

    },
    feature: function (param, value) {

        var command;

        if (value) {
            command = 'feature ' + param + '\n';
        } else {
            command = 'feature -' + param + '\n';
        }

        console.log(command);
        this.send(command);

    },
    setSerial: function (portNumber, portFunction, portBaudrate) {

        this.send("serial " + portNumber + " " + portFunction + " 115200 57600 " + portBaudrate + " 115200\n");

    },
    getStatus: function () {
        this.send("status\n");
    }

};

function parseStatus(line, search, operator) {
    var result = [];
    var i = 0;
    line.split(', ').forEach(function (x) {
		if(x.contains(search)){
			var arr = x.split(search + operator);
			result[0] = arr[1];
		}
        i++;
    });
    return result;
}