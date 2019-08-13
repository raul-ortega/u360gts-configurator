/*
 If an id is also specified and a window with a matching id has been shown before, the remembered bounds of the window will be used instead.
 
 In this JS we cannot use the i18n wrapper used in the rest of the application (it is not available). We must remain with the chrome one.
 */
'use strict';

function startApplication() {
    var applicationStartTime = new Date().getTime();

    chrome.app.window.create('main.html', {
        id: 'main-window',
        frame: 'chrome',
        innerBounds: {
            minWidth: 1280,
            minHeight: 720
        }
    }, function (createdWindow) {
        if (getChromeVersion() >= 54) {
            createdWindow.icon = 'images/gts/icons/gts_icon_128.png';
        }
        createdWindow.onClosed.addListener(function () {

            // automatically close the port when application closes
            // save connectionId in separate variable before createdWindow.contentWindow is destroyed
            var connectionId = createdWindow.contentWindow.serial.connectionId;
            var valid_connection = createdWindow.contentWindow.CONFIGURATOR.connectionValid;
            
            if (connectionId && valid_connection) {

                var line = "exit\n";

                var bufferOut = new ArrayBuffer(line.length);
                var bufView = new Uint8Array(bufferOut);

                for (var c_key = 0; c_key < line.length; c_key++) {
                    bufView[c_key] = line.charCodeAt(c_key);
                }

                chrome.serial.send(connectionId, bufferOut, function (sendInfo) {
                    chrome.serial.disconnect(connectionId, function (result) {
                        console.log('SERIAL: Connection closed - ' + result);
                    });
                });

            } else if (connectionId) {
                
                chrome.serial.disconnect(connectionId, function (result) {
                    console.log('SERIAL: Connection closed - ' + result);
                });
                
            }
        });
    });
}

chrome.app.runtime.onLaunched.addListener(startApplication);

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'update') {
        var previousVersionArr = details.previousVersion.split('.'),
                currentVersionArr = getManifestVersion().split('.');

        // only fire up notification sequence when one of the major version numbers changed
        if (currentVersionArr[0] > previousVersionArr[0] || currentVersionArr[1] > previousVersionArr[1]) {
            chrome.storage.local.get('update_notify', function (result) {
                if (result.update_notify === 'undefined' || result.update_notify) {
                    var manifest = chrome.runtime.getManifest();
                    var options = {
                        priority: 0,
                        type: 'basic',
                        title: manifest.name,
                        message: chrome.i18n.getMessage('notifications_app_just_updated_to_version', [getManifestVersion(manifest)]),
                        iconUrl: '/images/icon_128.png',
                        buttons: [{'title': chrome.i18n.getMessage('notifications_click_here_to_start_app')}]
                    };

                    chrome.notifications.create('baseflight_update', options, function (notificationId) {
                        // empty
                    });
                }
            });
        }
    }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
    if (notificationId == 'baseflight_update') {
        startApplication();
    }
});

function getManifestVersion(manifest) {
    if (!manifest) {
        manifest = chrome.runtime.getManifest();
    }

    var version = manifest.version_name;
    if (!version) {
        version = manifest.version;
    }

    return version;
}

function getChromeVersion() {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);

    return raw ? parseInt(raw[2], 10) : false;
}
