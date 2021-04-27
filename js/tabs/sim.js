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

        $(".simulator-start").on('click', function (e) {

            $("#simulator-log").html('');

            $('.simulator-start').hide();
            $('.simulator-stop').show();

            home0[0] = $("#simulator-home-lat").val();
            home0[1] = $("#simulator-home-lon").val();

            accDistance = 0;
            radius = $("#simulator-distance").val();
            altitude = $("#simulator-altitude").val();
            startDistance = radius; // Revisar
            simulationStarted = true;
            sendHomeTimer = new Date().getTime();
            lastPoint = new LatLon(home0[0], home0[1]);
            course = 0;
            protocol = $("#simulation-protocol").val();

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

			sendHeartBeat = $("#simulator-mavlink-heartbeat").prop('checked');
			heartbeatTimer = new Date().getTime();


            if (protocol == protocols.MFD)
                NMEAGPGGA = setHome2MFD();
            else
                NMEAGPGGA = buildPacket(p1.lat, p1.lon, altitude, 0, 0);

            GTS.send(NMEAGPGGA + '\n');
            $("#simulator-log").append(NMEAGPGGA + '\n');

            // SIM LOOP
            GUI.interval_add("sim_interval", function () {
                radius = $("#simulator-distance").val();
                altitude = $("#simulator-altitude").val();
                if (new Date().getTime() - sendHomeTimer < $("#simulation-start-delay").val() * 1000) {
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
        
		$("#simulator-home-lat").on('change',function(){
			TABS.sim.storeCustomLatLon();
		});
		
		$("#simulator-home-lon").on('change',function(){
			TABS.sim.storeCustomLatLon();
		});
		
		chrome.storage.local.get('userHomeLatLon', function (result) {
			if (result.userHomeLatLon) {
				var latlon = result.userHomeLatLon.split(',');
				$("#simulator-home-lat").val(latlon[0]);
				$("#simulator-home-lon").val(latlon[1]);
			}
		});		

        GUI.content_ready(callback);
        
    });

};

TABS.sim.updateSimMap = function (lat, lon, alt, speed, distHome, sats, fix) {

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

TABS.sim.storeCustomLatLon = function (){
	var lat = $("#simulator-home-lat").val();
	var lon = $("#simulator-home-lon").val();
	var latlon = lat + ',' + lon;
	chrome.storage.local.set({'userHomeLatLon': latlon});
};
