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
            GUI.reboot();
        });

        GUI.content_ready(callback);

    });

};

TABS.settings.cleanup = function (callback) {
    console.log("cleanup config");
    if (callback)
        callback();
};


