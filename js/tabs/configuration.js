'use strict';
TABS.configuration = {
    lastCommand: ""
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
        });
        $('#tilt-slider').on('change', function () {
            $('#tilt-output').val($('#tilt-slider').val());
            //setTiltPosition($('#tilt-slider').val());
        });
        $('#tilt-output').on('change', function () {
            if ($('#tilt-output').val() !== $('#tilt-slider').val()) {
                console.log("Mueve tilt");
                $('#tilt-slider').val($('#tilt-output').val());
                //setTiltPosition($('#tilt-output').val());
            }
        });
        $('#pan-slider').on('change', function () {
            $('#pan-output').val($('#pan-slider').val());
            //setHeadingPosition($('#pan-slider').val());
        });
        $('#pan-output').on('change', function () {
            if ($('#pan-output').val() !== $('#pan-slider').val()) {
                console.log("Mueve pan");
                $('#pan-slider').val($('#pan-output').val());
                //setHeadingPosition($('#pan-output').val());
            }
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

        if (portNumber > 1) {

            GUI.softserial_count++;

            var selectProtocolID = "softserial" + GUI.softserial_count + "-protocol";
            var selectBaudrateID = "softserial" + GUI.softserial_count + "-baudrate";

            // Add port row
            $('#portsTable tr:last').after('<tr>\n\
                                            <td>Softserial ' + GUI.softserial_count + '</td>\n\
                                            <td>\n\
                                                <select id="' + selectProtocolID + '">\n\
                                                    <option value="0" >Select protocol</option>\n\
                                                    <option value="256">MFD</option>\n\
                                                    <option value="512">MAVLINK</option>\n\
                                                    <option value="1024">NMEA</option>\n\
                                                    <option value="2048">LTM</option>\n\
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

// Pasar a GTS.. TO DO
TABS.configuration.getVersion = function () {
    GTS.send("version\n");
};

TABS.configuration.getData = function () {
    TABS.configuration.lastCommand = "set";
    GTS.send("set\nfeature\nserial\n");
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


