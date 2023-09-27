'use strict';
var mspHelper;
function buildIpPicker(){
	chrome.system.network.getNetworkInterfaces(function(interfaces){
		console.log(interfaces);
		$('div#client-override-option #client-override-select').html('');
		if(interfaces.length) {
			interfaces.forEach(element => {
				if (element['prefixLength'] < 64 && !self.connected) {
					$('div#client-override-option #client-override-select').append($("<option/>", {value: element['address'], text: element['address']}));
				}
			});
		} else
			GUI.log("No network interfaces found");
	});
}
function initializeSerialBackend() {

    GUI.updateManualPortVisibility = function () {
        var selected_port = $('div#port-picker #port option:selected');
        if (selected_port.data().isManual) {
            $('#port-override-option').show();
        } else if (selected_port.data().isUDP) {
            $('#server-override-option').show();
			$('#client-override-option').show();
            $('#port-override-option').show();
        } else {
            $('#port-override-option').hide();
			$('#client-override-option').hide();
            $('#server-override-option').hide();
        }
        if (selected_port.data().isDFU) {
            $('select#baud').hide();
        } else {
            $('select#baud').show();
        }
    };

    buildIpPicker();

    GUI.updateManualPortVisibility();

    $('#port-override').change(function () {
        chrome.storage.local.set({'portOverride': $('#port-override').val()});
    });

    chrome.storage.local.get('portOverride', function (data) {
        $('#port-override').val(data.portOverride);
    });

    $('div#port-picker #port').change(function (target) {
        GUI.updateManualPortVisibility();
    });

    $('div.connect_controls a.connect').click(function () {
        if (GUI.connect_lock != true) { // GUI control overrides the user control

            var thisElement = $(this);
            var clicks = thisElement.data('clicks');

            var toggleStatus = function () {
                thisElement.data("clicks", !clicks);
            };

            var selected_baud = parseInt($('div#port-picker #baud').val());
            var selected_port = $('div#port-picker #port option:selected').val();
            selected_port = (selected_port == 'udp' ?
                'udp://' + String($('#server-override').val()) + ':' + String($('#port-override').val()):
                $('div#port-picker #port option:selected').data().isManual ?
                    $('#port-override').val() :
                    String($('div#port-picker #port').val()));
            if (selected_port === 'DFU') {
                GUI.log(i18n.getMessage('dfu_connect_message'));
            /*} else if (selected_port == 'udp') {
            
                var udp_server = $('#server-override').val();
                var udp_port = $('#port-override').val();
                GUI.log('udp - ' + udp_server + ':' + udp_port);
                var dgram = require('dgram');
                var s = dgram.createSocket('udp4');
                s.send(Buffer.from('RRR'), udp_port, udp_server);*/

            } else if (selected_port != '0') {
                if (!clicks) {
                    console.log('Connecting to: ' + selected_port);
                    GUI.connecting_to = selected_port;

                    // lock port select & baud while we are connecting / connected
                    $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay').prop('disabled', true);
                    $('div.connect_controls a.connect_state').text(i18n.getMessage('connecting'));

                    serial.connect(selected_port, {bitrate: selected_baud}, onOpen);

                    toggleStatus();
                } else {
                    GUI.timeout_kill_all();
                    GUI.interval_kill_all();
                    GUI.tab_switch_cleanup();
                    GUI.tab_switch_in_progress = false;



                    function onFinishCallback() {
                        finishClose(toggleStatus);
                    }

                    // Exit del modo cli o sim
                    if (GUI.simModeEnabled) {
                        $("#simModeSwitch").click();
                        finishClose(toggleStatus);
                    } else {
                        GTS.send("exit\n", onFinishCallback);
                    }


                }
            }
        }
    });

    // auto-connect
    chrome.storage.local.get('auto_connect', function (result) {
        if (result.auto_connect === 'undefined' || result.auto_connect) {
            // default or enabled by user
            GUI.auto_connect = true;

            $('input.auto_connect').prop('checked', true);
            $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectEnabled'));

            $('select#baud').val(115200).prop('disabled', true);
        } else {
            // disabled by user
            GUI.auto_connect = false;

            $('input.auto_connect').prop('checked', false);
            $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectDisabled'));
        }

        // bind UI hook to auto-connect checkbos
        $('input.auto_connect').change(function () {
            GUI.auto_connect = $(this).is(':checked');

            // update title/tooltip
            if (GUI.auto_connect) {
                $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectEnabled'));

                $('select#baud').val(115200).prop('disabled', true);
            } else {
                $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectDisabled'));

                if (!GUI.connected_to && !GUI.connecting_to)
                    $('select#baud').prop('disabled', false);
            }

            chrome.storage.local.set({'auto_connect': GUI.auto_connect});
        });
    });

    PortHandler.initialize();
    PortUsage.initialize();
}

function finishClose(finishedCallback) {
    var wasConnected = CONFIGURATOR.connectionValid;

    serial.disconnect(onClosed);

    //MSP.disconnect_cleanup();
    PortUsage.reset();

    GUI.connected_to = false;
    GUI.allowedTabs = GUI.defaultAllowedTabsWhenDisconnected.slice();
    // Reset various UI elements
    $('span.i2c-error').text(0);
    $('span.cycle-time').text(0);
//    if (semver.gte(CONFIG.apiVersion, "1.20.0"))
//        $('span.cpu-load').text('');

    // unlock port select & baud
    $('div#port-picker #port').prop('disabled', false);
    if (!GUI.auto_connect)
        $('div#port-picker #baud').prop('disabled', false);

    // reset connect / disconnect button
    $('div.connect_controls a.connect').removeClass('active');
    $('div.connect_controls a.connect_state').text(i18n.getMessage('connect'));

    // reset active sensor indicators
    //sensor_status(0);

    if (wasConnected) {
        // detach listeners and remove element data
        $('#content').empty();
    }

    $('#tabs .tab_landing a').click();

    finishedCallback();
}


function onOpen(openInfo) {
    if (openInfo) {
        // update connected_to
        GUI.connected_to = GUI.connecting_to;
		GUI.connected_baud =  $('div#port-picker #baud').val();

        // reset connecting_to
        GUI.connecting_to = false;

        GUI.log(i18n.getMessage('serialPortOpened', [openInfo.connectionId]));

        // save selected port with chrome.storage if the port differs
        chrome.storage.local.get('last_used_port', function (result) {
            if (result.last_used_port) {
                if (result.last_used_port != GUI.connected_to) {
                    // last used port doesn't match the one found in local db, we will store the new one
                    chrome.storage.local.set({'last_used_port': GUI.connected_to});
                }
            } else {
                // variable isn't stored yet, saving
                chrome.storage.local.set({'last_used_port': GUI.connected_to});
            }
        });
		
		chrome.storage.local.get('last_used_baud', function (result) {
            if (result.last_used_baud) {
                if (result.last_used_baud != GUI.connected_baud) {
                    // last used baud doesn't match the one found in local db, we will store the new one
                    chrome.storage.local.set({'last_used_baud': GUI.connected_baud});
                }
            } else {
                // variable isn't stored yet, saving
                chrome.storage.local.set({'last_used_baud': GUI.connected_baud});
            }
        });

        serial.onReceive.addListener(read_serial);

        // disconnect after 10 seconds with error if we don't get IDENT data
        GUI.timeout_add('connecting', function () {
            if (!CONFIGURATOR.connectionValid) {
                GUI.log(i18n.getMessage('noConfigurationReceived'));

                $('div.connect_controls a.connect').click(); // disconnect
            }
        }, 10000);

		FC.resetState();
        // OJO ESTO NO VA AQUÍ
        finishOpen();


//        MSP.listen(update_packet_error);
//        mspHelper = new MspHelper();
//        MSP.listen(mspHelper.process_data.bind(mspHelper));

        // request configuration data SOLICITAMOS CONFIGURACION RRR

//        MSP.send_message(MSPCodes.MSP_API_VERSION, false, false, function () {
//            GUI.log(i18n.getMessage('apiVersionReceived', [CONFIG.apiVersion]));
//
//            if (semver.gte(CONFIG.apiVersion, CONFIGURATOR.apiVersionAccepted)) {
//
//                MSP.send_message(MSPCodes.MSP_FC_VARIANT, false, false, function () {
//                    if (CONFIG.flightControllerIdentifier === 'BTFL' || (CONFIG.flightControllerIdentifier === 'CLFL')) {
//                        MSP.send_message(MSPCodes.MSP_FC_VERSION, false, false, function () {
//
//                            googleAnalytics.sendEvent('Firmware', 'Variant', CONFIG.flightControllerIdentifier + ',' + CONFIG.flightControllerVersion);
//
//                            GUI.log(i18n.getMessage('fcInfoReceived', [CONFIG.flightControllerIdentifier, CONFIG.flightControllerVersion]));
//                            updateStatusBarVersion(CONFIG.flightControllerVersion, CONFIG.flightControllerIdentifier);
//                            updateTopBarVersion(CONFIG.flightControllerVersion, CONFIG.flightControllerIdentifier);
//
//                            if ((CONFIG.flightControllerIdentifier === 'CLFL' && semver.lt(CONFIG.apiVersion, '1.34.0')) ||
//                                (CONFIG.flightControllerIdentifier === 'BTFL' && semver.lt(CONFIG.apiVersion, '1.20.0'))) {
//                                
//                                var dialog = $('.dialogConnectWarning')[0];
//
//                                $('.dialogConnectWarning-content').html(i18n.getMessage('firmwareUpgradeRequired'));
//
//                                $('.dialogConnectWarning-closebtn').click(function() {
//                                    dialog.close();
//                                });
//
//                                dialog.showModal();
//
//                                connectCli();
//                            } else {
//                            
//                                MSP.send_message(MSPCodes.MSP_BUILD_INFO, false, false, function () {
//    
//                                    googleAnalytics.sendEvent('Firmware', 'Using', CONFIG.buildInfo);
//                                    GUI.log(i18n.getMessage('buildInfoReceived', [CONFIG.buildInfo]));
//
//                                    updateStatusBarVersion(CONFIG.flightControllerVersion, CONFIG.flightControllerIdentifier, CONFIG.boardIdentifier);
//                                    updateTopBarVersion(CONFIG.flightControllerVersion, CONFIG.flightControllerIdentifier, CONFIG.boardIdentifier);
//
//                                    MSP.send_message(MSPCodes.MSP_BOARD_INFO, false, false, function () {
//    
//                                        googleAnalytics.sendEvent('Board', 'Using', CONFIG.boardIdentifier + ',' + CONFIG.boardVersion);
//                                        GUI.log(i18n.getMessage('boardInfoReceived', [CONFIG.boardIdentifier, CONFIG.boardVersion]));
//    
//                                        MSP.send_message(MSPCodes.MSP_UID, false, false, function () {
//                                            GUI.log(i18n.getMessage('uniqueDeviceIdReceived', [CONFIG.uid[0].toString(16) + CONFIG.uid[1].toString(16) + CONFIG.uid[2].toString(16)]));
//
//                                            CONFIG.armingDisabled = false;
//                                            mspHelper.setArmingEnabled(false, false, finishOpen);
//                                            
//                                            finishOpen();
//                                        });
//                                    });
//                                });
//                            }
//                        });
//                    } else {
//                        var dialog = $('.dialogConnectWarning')[0];
//
//                        $('.dialogConnectWarning-content').html(i18n.getMessage('firmwareTypeNotSupported'));
//
//                        $('.dialogConnectWarning-closebtn').click(function() {
//                            dialog.close();
//                        });
//
//                        dialog.showModal();
//
//                        connectCli();
//                    }
//                });
//            } else {
//                var dialog = $('.dialogConnectWarning')[0];
//
//                $('.dialogConnectWarning-content').html(i18n.getMessage('firmwareVersionNotSupported', [CONFIGURATOR.apiVersionAccepted]));
//
//                $('.dialogConnectWarning-closebtn').click(function() {
//                    dialog.close();
//                });
//
//                dialog.showModal();
//
//                connectCli();
//            }
//        });
    } else {
        console.log('Failed to open serial port');
        GUI.log(i18n.getMessage('serialPortOpenFail'));

        $('div#connectbutton a.connect_state').text(i18n.getMessage('connect'));
        $('div#connectbutton a.connect').removeClass('active');

        // unlock port select & baud
        $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay').prop('disabled', false);

        // reset data
        $('div#connectbutton a.connect').data("clicks", false);
    }
}

function finishOpen() {

    CONFIGURATOR.connectionValid = true;

    GUI.allowedTabs = [];

    GUI.allowedTabs = GUI.defaultAllowedFCTabsWhenConnected.slice();

    onConnect();

    var defaultTab = GUI.allowedTabs[0];
    var defaultTabMode = "mode-connected";

    if (GUI.simModeEnabled) {
        defaultTab = "sim";
        defaultTabMode = "mode-disconnected";
        TABS.sim.initialize();

    } else {
        // Una vez completada la conexión, solicitamos entrar en el CLI
        GTS.send("RRR");
    }

    $('#tabs ul.' + defaultTabMode + ' .tab_' + defaultTab + ' a').click();
}

function connectCli() {
    CONFIGURATOR.connectionValid = true; // making it possible to open the CLI tab
    GUI.allowedTabs = ['cli'];
    onConnect();
    $('#tabs .tab_cli a').click();
}

function onConnect() {
    GUI.timeout_remove('connecting'); // kill connecting timer
    $('div#connectbutton a.connect_state').text(i18n.getMessage('disconnect')).addClass('active');
    $('div#connectbutton a.connect').addClass('active');

    if (!GUI.simModeEnabled) {

        $('#tabs ul.mode-disconnected').hide();
        $('#tabs ul.mode-connected-cli').show();

        // show only appropriate tabs
        $('#tabs ul.mode-connected li').hide();
        $('#tabs ul.mode-connected li').filter(function (index) {
            var classes = $(this).attr("class").split(/\s+/);
            var found = false;
            $.each(GUI.allowedTabs, function (index, value) {
                var tabName = "tab_" + value;
                if ($.inArray(tabName, classes) >= 0) {
                    found = true;
                }
            });
            return found;
        }).show();

        // show connected tabs list
        $('#tabs ul.mode-connected').show();

    }

    var sensor_state = $('#sensor-status');
    sensor_state.show();

    var port_picker = $('#portsinput');
    port_picker.hide();

    //var dataflash = $('#dataflash_wrapper_global');
    //dataflash.show();

    var battery = $('#quad-status_wrapper');
    battery.show();

}

function onClosed(result) {
    if (result) { // All went as expected
        GUI.log(i18n.getMessage('serialPortClosedOk'));
    } else { // Something went wrong
        GUI.log(i18n.getMessage('serialPortClosedFail'));
    }

    $('#tabs ul.mode-connected').hide();
    $('#tabs ul.mode-connected-cli').hide();
    $('#tabs ul.mode-disconnected').show();

    updateStatusBarVersion();
    updateTopBarVersion();

    var sensor_state = $('#sensor-status');
    sensor_state.hide();

    var port_picker = $('#portsinput');
    port_picker.show();

    //var dataflash = $('#dataflash_wrapper_global');
    //dataflash.hide();

    var battery = $('#quad-status_wrapper');
    battery.hide();

    //MSP.clearListeners();

    CONFIGURATOR.connectionValid = false;
    CONFIGURATOR.cliValid = false;
    CONFIGURATOR.cliActive = false;
}

function read_serial(info) {

    if (GUI.active_tab != 'cli') {
        GTS.read(info);
    } else {
        TABS.cli.read(info);
    }

}

//function sensor_status(sensors_detected) {
//    // initialize variable (if it wasn't)
//    if (!sensor_status.previous_sensors_detected) {
//        sensor_status.previous_sensors_detected = -1; // Otherwise first iteration will not be run if sensors_detected == 0
//    }
//
//    // update UI (if necessary)
//    if (sensor_status.previous_sensors_detected == sensors_detected) {
//        return;
//    }
//
//    // set current value
//    sensor_status.previous_sensors_detected = sensors_detected;
//
//    var e_sensor_status = $('div#sensor-status');
//
//    if (have_sensor(sensors_detected, 'acc')) {
//        $('.accel', e_sensor_status).addClass('on');
//        $('.accicon', e_sensor_status).addClass('active');
//
//    } else {
//        $('.accel', e_sensor_status).removeClass('on');
//        $('.accicon', e_sensor_status).removeClass('active');
//    }
//
////    if ((CONFIG.boardType == 0 || CONFIG.boardType == 2) && have_sensor(sensors_detected, 'gyro')) {
////        $('.gyro', e_sensor_status).addClass('on');
////        $('.gyroicon', e_sensor_status).addClass('active');
////    } else {
////        $('.gyro', e_sensor_status).removeClass('on');
////        $('.gyroicon', e_sensor_status).removeClass('active');
////    }
//
//    if (have_sensor(sensors_detected, 'baro')) {
//        $('.baro', e_sensor_status).addClass('on');
//        $('.baroicon', e_sensor_status).addClass('active');
//    } else {
//        $('.baro', e_sensor_status).removeClass('on');
//        $('.baroicon', e_sensor_status).removeClass('active');
//    }
//
//    if (have_sensor(sensors_detected, 'mag')) {
//        $('.mag', e_sensor_status).addClass('on');
//        $('.magicon', e_sensor_status).addClass('active');
//    } else {
//        $('.mag', e_sensor_status).removeClass('on');
//        $('.magicon', e_sensor_status).removeClass('active');
//    }
//
//    if (have_sensor(sensors_detected, 'gps')) {
//        $('.gps', e_sensor_status).addClass('on');
//    $('.gpsicon', e_sensor_status).addClass('active');
//    } else {
//        $('.gps', e_sensor_status).removeClass('on');
//        $('.gpsicon', e_sensor_status).removeClass('active');
//    }
//
//    if (have_sensor(sensors_detected, 'sonar')) {
//        $('.sonar', e_sensor_status).addClass('on');
//        $('.sonaricon', e_sensor_status).addClass('active');
//    } else {
//        $('.sonar', e_sensor_status).removeClass('on');
//        $('.sonaricon', e_sensor_status).removeClass('active');
//    }
//}
//
//function have_sensor(sensors_detected, sensor_code) {
//    switch(sensor_code) {
//        case 'acc':
//            return bit_check(sensors_detected, 0);
//        case 'baro':
//            return bit_check(sensors_detected, 1);
//        case 'mag':
//            return bit_check(sensors_detected, 2);
//        case 'gps':
//            return bit_check(sensors_detected, 3);
//        case 'sonar':
//            return bit_check(sensors_detected, 4);
//        case 'gyro':
//            if (semver.gte(CONFIG.apiVersion, "1.36.0")) {
//                return bit_check(sensors_detected, 5);
//            } else {
//                return true;
//            }
//    }
//    return false;
//}

//function startLiveDataRefreshTimer() {
//    // live data refresh
//    GUI.timeout_add('data_refresh', function () {
//        update_live_status();
//    }, 100);
//}

//function update_live_status() {
//
//    var statuswrapper = $('#quad-status_wrapper');
//
//    $(".quad-status-contents").css({
//        display: 'inline-block'
//    });
//
//    if (GUI.status.mag) {
//        $('.mag').addClass('on');
//        $('.magicon').addClass('active');
//    } else {
//        $('.mag').removeClass('on');
//        $('.magicon').removeClass('active');
//    }
//
//    GTS.getStatus();

//    if (GUI.active_tab != 'cli') {
//        MSP.send_message(MSPCodes.MSP_BOXNAMES, false, false);
//        if (semver.gte(CONFIG.apiVersion, "1.32.0"))
//            MSP.send_message(MSPCodes.MSP_STATUS_EX, false, false);
//        else
//            MSP.send_message(MSPCodes.MSP_STATUS, false, false);
//        MSP.send_message(MSPCodes.MSP_ANALOG, false, false);
//    }
//
//    var active = ((Date.now() - ANALOG.last_received_timestamp) < 300);
//
//    for (var i = 0; i < AUX_CONFIG.length; i++) {
//        if (AUX_CONFIG[i] == 'ARM') {
//            if (bit_check(CONFIG.mode, i))
//                $(".armedicon").css({
//                    'background-image': 'url(images/cf/icons/cf_icon_armed_active.svg)'
//                });
//            else
//                $(".armedicon").css({
//                    'background-image': 'url(images/icons/cf_icon_armed_grey.svg)'
//                });
//        }
//        if (AUX_CONFIG[i] == 'FAILSAFE') {
//            if (bit_check(CONFIG.mode, i))
//                $(".failsafeicon").css({
//                    'background-image': 'url(images/cf/icons/cf_icon_failsafe_active.svg)'
//                });
//            else
//                $(".failsafeicon").css({
//                    'background-image': 'url(images/icons/cf_icon_failsafe_grey.svg)'
//                });
//        }
//    }
//    if (ANALOG != undefined) {
//        var nbCells = Math.floor(ANALOG.voltage / BATTERY_CONFIG.vbatmaxcellvoltage) + 1;
//        if (ANALOG.voltage == 0)
//            nbCells = 1;
//
//        var min = BATTERY_CONFIG.vbatmincellvoltage * nbCells;
//        var max = BATTERY_CONFIG.vbatmaxcellvoltage * nbCells;
//        var warn = BATTERY_CONFIG.vbatwarningcellvoltage * nbCells;
//
//        $(".battery-status").css({
//            width: ((ANALOG.voltage - min) / (max - min) * 100) + "%",
//            display: 'inline-block'
//        });
//
//        if (active) {
//            $(".linkicon").css({
//                'background-image': 'url(images/cf/icons/cf_icon_link_active.svg)'
//            });
//        } else {
//            $(".linkicon").css({
//                'background-image': 'url(images/icons/cf_icon_link_grey.svg)'
//            });
//        }
//
//        if (ANALOG.voltage < warn) {
//            $(".battery-status").css('background-color', '#D42133');
//        } else {
//            $(".battery-status").css('background-color', '#59AA29');
//        }
//
//        $(".battery-legend").text(ANALOG.voltage + " V");
//    }
//
//    statuswrapper.show();
//    GUI.timeout_remove('data_refresh');
//    startLiveDataRefreshTimer();
//}

function specificByte(num, pos) {
    return 0x000000FF & (num >> (8 * pos));
}

function bit_check(num, bit) {
    return ((num >> bit) % 2 != 0);
}

function bit_set(num, bit) {
    return num | 1 << bit;
}

function bit_clear(num, bit) {
    return num & ~(1 << bit);
}

/*
 function bf_update_dataflash_global() {
 var supportsDataflash = DATAFLASH.totalSize > 0;
 if (supportsDataflash){
 
 $(".noflash_global").css({
 display: 'none'
 });
 
 $(".dataflash-contents_global").css({
 display: 'block'
 });
 
 $(".dataflash-free_global").css({
 width: (100-(DATAFLASH.totalSize - DATAFLASH.usedSize) / DATAFLASH.totalSize * 100) + "%",
 display: 'block'
 });
 $(".dataflash-free_global div").text('Dataflash: free ' + formatFilesize(DATAFLASH.totalSize - DATAFLASH.usedSize));
 } else {
 $(".noflash_global").css({
 display: 'block'
 });
 
 $(".dataflash-contents_global").css({
 display: 'none'
 });
 }
 }
 */

function update_dataflash_global() {
    function formatFilesize(bytes) {
        if (bytes < 1024) {
            return bytes + "B";
        }
        var kilobytes = bytes / 1024;

        if (kilobytes < 1024) {
            return Math.round(kilobytes) + "kB";
        }

        var megabytes = kilobytes / 1024;

        return megabytes.toFixed(1) + "MB";
    }

    var supportsDataflash = DATAFLASH.totalSize > 0;

    if (supportsDataflash) {
        $(".dataflash-noflash_global").hide();

        $(".dataflash-haveflash_global").show();

        $(".dataflash-free_global").css({
            width: (100 - (DATAFLASH.totalSize - DATAFLASH.usedSize) / DATAFLASH.totalSize * 100) + "%"
        });

        var usageMessage = chrome.i18n.getMessage('dataflashUsage', [
            formatFilesize(DATAFLASH.totalSize - DATAFLASH.usedSize),
            formatFilesize(DATAFLASH.totalSize)
        ]);
        $(".dataflash-usage_global").text(usageMessage);
    } else {
        $(".dataflash-noflash_global").show();

        $(".dataflash-haveflash_global").hide();
    }
}

