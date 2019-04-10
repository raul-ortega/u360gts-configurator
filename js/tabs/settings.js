'use strict';

TABS.settings = {
    lastCommand: ""
};
TABS.settings.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'settings') {
        GUI.active_tab = 'settings';
    }

    $('#content').load("./tabs/settings.html", function () {
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

TABS.settings.loadData = function (data) {

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

    if (data.startsWith('serial')) {

        //console.log("Encontramos serial");

        var portNumber = data.split(' ')[1];
        var portFunction = Number(data.split(' ')[2]);
        var portProtocol = Number(data.split(' ')[3]);
        var portBaudRate = Number(data.split(' ')[5]);

        console.log("Serial:" + portNumber + " Function: " + portFunction + " Protocol: " + portProtocol + " Bauds: " + portBaudRate);

        var portPicker = $('#relay_telemetry_port-select');
        var protocolPicker = $('#relay_telemetry_protocol-select');
        var baudPicker = $('#relay_telemetry_baud-select');

        //$('relay_telemetry_port-select').append($('<option></option>').val(portNumber).html("Serial " + portNumber));

        //var options = portPicker.attr('options');
        //options[options.length] = new Option("Serial " + portNumber, portNumber, true, true);

        portPicker.append(new Option("Serial " + portNumber, portNumber));

//        if (portFunction == 0 || portFunction >= 256) {
//            var portOption = document.createElement('option');
//            portOption.value = portOption.innerText = portNumber;
//            if (portFunction >= 256)
//                portOption.selected = true;
//            //selectPicker.appendChild(portOption);
//            portPicker.append(new Option("Serial " + portNumber, portNumber));
//        }
//        if (portFunction >= 256) {
//            $("#relay_telemetry_protocol-select option").each(function () {
//                $(this).attr('selected', false);
//                if ($(this).val() == portFunction) {
//                    $("#relay_telemetry_protocol-select").val(portFunction);//$(this).attr('selected', true);
//                }
//            });
//            $("#relay_telemetry_baud-select option").each(function () {
//                $(this).attr('selected', false);
//                if ($(this).val() == portBaudRate) {
//                    $("#relay_telemetry_baud-select").val(portBaudRate);//$(this).attr('selected', true);
//                }
//            });
//        }

    }



};

// Pasar a GTS.. TO DO
TABS.settings.getVersion = function () {
    GTS.send("version\n");
};

TABS.settings.getData = function () {
    TABS.configuration.lastCommand = "set";
    GTS.send("set\nfeature\nserial\n");
};

TABS.settings.switcheryChange = function (elem) {

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

TABS.settings.cleanup = function (callback) {
    console.log("cleanup config");
    if (callback)
        callback();
};


