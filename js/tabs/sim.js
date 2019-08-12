'use strict';
/*global $*/

TABS.sim = {};

TABS.sim.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab !== 'sim') {
        GUI.active_tab = 'sim';
    }

    function set_online() {
        $('#connect').hide();
        //$('#waiting').show();
        $('#loadmap').show();
    }

    function set_offline() {
        $('#connect').show();
        $('#waiting').hide();
        $('#loadmap').hide();
    }

    $('#content').load("./tabs/sim.html", function () {
        // translate to user-selected language
        i18n.localizePage();



        if (GUI.simModeEnabled) {
            $('#simDisableDiv').hide();
            $('#simDiv').show();
        }

//        window.addEventListener('message', handleResponseFromMissionPlanner, false);
//        $("#simulator-force-error").click(function () {
//
//        });

        $(".simulator-start").on('click', function (e) {

            $("#simulator-log").html('');

            $('.simulator-start').hide();
            $('.simulator-stop').show();

            home0[0] = $("#simulator-home-lat").val();
            home0[1] = $("#simulator-home-lon").val();

//            if ($("#simulation-type").val() == 3) {
//                sendMessageToMissionPlanner('getHome');
//                //sendMessageToMissionPlanner('getPath');
//            }
//            /*else
//             sendMessageToMissionPlanner('setHome');*/

            accDistance = 0;
            radius = $("#simulator-distance").val();
            altitude = $("#simulator-altitude").val();
            startDistance = radius; // Revisar
            simulationStarted = true;
            sendHomeTimer = new Date().getTime();
            lastPoint = new LatLon(home0[0], home0[1]);
            course = 0;
            protocol = $("#simulation-protocol").val();

            //enableDisableSimulationButtons();



            var timerInterval = $("#simulation-frequency").val();
            var home = new LatLon(home0[0], home0[1]);
            var p1 = new LatLon(home.lat, home.lon);
            var directions = {left: 1, right: 2};
            var direction = directions.right;
            var navDistance = 0;
            var NMEAGPGGA;
            var distance2Home = 0;

            var p2 = new LatLon(home.lat, home.lon);
            var heading = 0;



            if (protocol == protocols.MFD)
                NMEAGPGGA = setHome2MFD();
            else
                NMEAGPGGA = buildPacket(p1.lat, p1.lon, altitude, 0, 0);

            GTS.send(NMEAGPGGA + '\n');
            $("#simulator-log").append(NMEAGPGGA + '\n');

            // SIM LOOP
            GUI.interval_add("sim_interval", function () {

//                if ($("#simulation-type").val() == 3) {
//                    if (typeof homePosition == 'undefined')
//                        return;
//                    else {
//                        p1 = new LatLon(homePosition.x, homePosition.y)
//                    }
//                }
//
                radius = $("#simulator-distance").val();
                altitude = $("#simulator-altitude").val();
                if (new Date().getTime() - sendHomeTimer < 5000) {
                    distance = 0;
                    heading = 0;
                    p2 = home.destinationPoint(distance, heading);
                } else {
                    // Speed
                    var varTime = (new Date().getTime() - calculateDistanceTimer);
                    if (calculateDistanceTimer == 0)
                        varTime = 0;//timerInterval;
                    distance = Speed($("#simulator-speed").val()) * (varTime / 1000);
                    if (accDistance < startDistance) {
                        heading = 0;
                        accDistance += distance;
                        p2 = p1.destinationPoint(distance, heading);
                    } else {
                        switch ($("#simulation-type").val()) {

                            case '1': //Circular
                                if (direction == directions.right) {
                                    heading += degreesPerSecond(distance, radius);
                                    if (heading >= 360 * 2)
                                        direction = directions.left;
                                } else if (direction == directions.left) {
                                    heading -= degreesPerSecond(distance, radius);
                                    if (heading <= 0)
                                        direction = directions.right;
                                }
                                p2 = home.destinationPoint(radius, heading);
                                break;

                            case '2': //Parallel
                                if (navDistance <= 300)
                                    navDistance += distance;
                                else {
                                    navDistance = -300;
                                    if (direction == directions.left)
                                        direction = directions.right;
                                    else if (direction == directions.right)
                                        direction = directions.left;
                                }
                                if (direction == directions.right)
                                    heading = 90;
                                else if (direction == directions.left)
                                    heading = 270;
                                p2 = p1.destinationPoint(distance, heading);
                                break;

                            case '3': //Custom
                                if (accDistance == 0) {

                                }
                        }
                    }
                }

                course = lastPoint.bearingTo(p2);
                $("#course").val(Math.round(course * 10) / 10);
                lastPoint.lat = p2.lat;
                lastPoint.lon = p2.lon;
                distance2Home = home.distanceTo(p2);
                NMEAGPGGA = buildPacket(p2.lat, p2.lon, altitude, distance2Home, course);

                showPacket(NMEAGPGGA);

                p1 = p2;
                calculateDistanceTimer = new Date().getTime();



                // Update Map
                //update_map(p2.lat, p2.lon, altitude, $("#simulator-speed").val(), distance2Home, $("#simulator-sats").val(), true)
                TABS.sim.updateSimMap(p2.lat, p2.lon, altitude, $("#simulator-speed").val(), distance2Home, $("#simulator-sats").val(), true);

            }, $("#simulation-frequency").val(), false);

        });


        $(".simulator-stop").on('click', function (e) {
            simulationStarted = false;
            GUI.interval_kill_all(false);
            $('.simulator-stop').hide();
            $('.simulator-start').show();

        });


        //check for internet connection on load
        if (navigator.onLine) {
            console.log('Online');
            set_online();
        } else {
            console.log('Offline');
            set_offline();
        }

//        $("#check").on('click', function () {
//            if (navigator.onLine) {
//                console.log('Online');
//                set_online();
//            } else {
//                console.log('Offline');
//                set_offline();
//            }
//        });

        var frame = document.getElementById('map');

        $('#zoom_in').click(function () {
            console.log('zoom in');
            var message = {
                action: 'zoom_in'
            };
            frame.contentWindow.postMessage(message, '*');
        });

        $('#zoom_out').click(function () {
            console.log('zoom out');
            var message = {
                action: 'zoom_out'
            };
            frame.contentWindow.postMessage(message, '*');
        });

        $('#update_map').click(function () {
            console.log('update map');
            var defaultHome = new LatLon($("#simulator-home-lat").val(), $("#simulator-home-lon").val());
            var message = {
                action: 'center',
                lat: defaultHome.lat,
                lon: defaultHome.lon
            };
            frame.contentWindow.postMessage(message, '*');
        });
        
        

        GUI.content_ready(callback);
        
    });

};

TABS.sim.updateSimMap = function (lat, lon, alt, speed, distHome, sats, fix) {

    var url = 'https://maps.google.com/?q=' + lat + ',' + lon;

//    $('.GPS_info td.fix').html((fix) ? i18n.getMessage('gpsFixTrue') : i18n.getMessage('gpsFixFalse'));
//    $('.GPS_info td.alt').text(alt + ' m');
//    $('.GPS_info td.lat a').prop('href', url).text(lat.toFixed(4) + ' deg');
//    $('.GPS_info td.lon a').prop('href', url).text(lon.toFixed(4) + ' deg');
//    $('.GPS_info td.speed').text(speed + ' km/h');
//    $('.GPS_info td.sats').text(sats);
//    $('.GPS_info td.distToHome').text(Math.trunc(distHome) + ' m');

    var message = {
        action: 'center',
        lat: lat,
        lon: lon
    };

    var frame = document.getElementById('map');
    frame.contentWindow.postMessage(message, '*');

}

TABS.sim.cleanup = function (callback) {
    if (callback)
        callback();
};

