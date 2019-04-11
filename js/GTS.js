var GTS = {

    last_received_timestamp: null,

    read: function (readInfo) {

        this.lineBuffer += ab2str(readInfo.data);

        var index;

        while ((index = this.lineBuffer.indexOf('\n')) >= 0) {

            var line = this.lineBuffer.substr(0, index + 1);

            console.log("<<: " + line);

            // ------- DIRECCIONAMOS LOS MSG ----------- //

            // Welcome msg from cli entering
            if (line.contains('Entering')) {
                GUI.log(i18n.getMessage('cliWelcome'));

                TABS.configuration.getVersion();
            }

            // Si recivimos versión
            if (line.contains('u360gts') || line.contains('amv-open360tracker')) {
                GUI.log(line);
            }

            // Acciones al recibir estando en la pestaña Configuration o Settings
            if (GUI.active_tab === 'configuration' || GUI.active_tab === 'settings') {

                switch (TABS.configuration.lastCommand) {

                    case "set":

                        TABS.configuration.loadData(line);

                        break;

                }


            }
            
//            if (line.startsWith('serial')) {
//                loadSSerial(line);
//            }

            // ------- --------------------- ----------- //

            this.lineBuffer = this.lineBuffer.substr(index + 1);

        }



        this.last_received_timestamp = Date.now();

    },
    send: function (line, callback) {
        var bufferOut = new ArrayBuffer(line.length);
        var bufView = new Uint8Array(bufferOut);

        for (var c_key = 0; c_key < line.length; c_key++) {
            bufView[c_key] = line.charCodeAt(c_key);
        }

        console.log(">>: " + line);

        serial.send(bufferOut, callback);

    },
    set: function (param, value) {

        var command = 'set ' + param + ' = ' + value + '\n';

        console.log(command);
        this.send(command);

    },
    save: function () {

        this.send("save\n");

        $('div.connect_controls a.connect').click();

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

    }

};

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

var str2ab = function (str) {
    var encodedString = unescape(encodeURIComponent(str));
    var bytes = new Uint8Array(encodedString.length);
    for (var i = 0; i < encodedString.length; ++i) {
        bytes[i] = encodedString.charCodeAt(i);
    }
    return bytes.buffer;
};


