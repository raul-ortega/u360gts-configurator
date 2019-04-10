'use strict';
/*global $*/

TABS.sim = {};
TABS.sim.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab !== 'sim') {
        GUI.active_tab = 'sim';
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
            distance = radius; // Revisar
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



//            if (protocol == protocols.MFD) {
//                NMEAGPGGA = setHome2MFD();
//                serialSend(connectionId, str2ab(NMEAGPGGA + '\n'));
//                showPacket(NMEAGPGGA);
//            }

            NMEAGPGGA = buildPacket(p1.lat, p1.lon, altitude, 0, 0);
            $("#simulator-log").append(NMEAGPGGA + '\n');
//          
            GUI.interval_add("sim_interval", function () {
                
            
            
            //simulatorTimer = setInterval(function () {
//                /*if(debugEnabled) {
//                 console.log();
//                 }*/
//
//                if ($("#simulation-type").val() == 3) {
//                    if (typeof homePosition == 'undefined')
//                        return;
//                    else {
//                        p1 = new LatLon(homePosition.x, homePosition.y)
//                    }
//                }
//
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

            //}, timerInterval);
            
            }, $("#simulation-frequency").val(), false);
            
        });


        $(".simulator-stop").on('click', function (e) {
            simulationStarted = false;
            //clearInterval(simulatorTimer);
            GUI.interval_remove("sim_interval");

            $('.simulator-stop').hide();
            $('.simulator-start').show();

        });


        GUI.content_ready(callback);
    });

};

TABS.sim.cleanup = function (callback) {
    if (callback)
        callback();
};

