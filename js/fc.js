'use strict';

// define all the global variables that are uses to hold FC state
var CONFIG;
var FEATURE_CONFIG;
var SERIAL_CONFIG;
var PARAMETERS_CONFIG;
var FC = {
    resetState: function() {
        CONFIG = {
            targetName:                 '',
			firmwareName:               '',
			firmwareVersion:            '',
            firmwareVersionMayor:       0,
			firmwareVersionMinor:       0,
			firmwareVersionPathLevel:   0,
			buildDate:                  '',
			buildMonth:                 '',
			buildDay:                   '',
            buildTime:                  '',
            buildId:                    '',
        };

        FEATURE_CONFIG = {
            features:                   0,
        };

        SERIAL_CONFIG = {
            ports:                      [],

            // pre 1.6 settings
            mspBaudRate:                0,
            gpsBaudRate:                0,
            gpsPassthroughBaudRate:     0,
            cliBaudRate:                0,
        };
		
		PARAMETERS_CONFIG = {
			parameters:                 [],
		};
    }
};
