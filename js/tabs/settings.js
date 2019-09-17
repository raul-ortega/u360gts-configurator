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
			GUI.setLastBaud();
            GUI.reboot();
        });
		
		$('#nopid_min_delta-spinner').on('change',function(){
			var value = $('#nopid_min_delta-spinner').val();
			if($.isNumeric(value)){
				if(value < 0) value = 0;
				if(value > 180) value = 180;
			} else
				value = 0;
			$('#nopid_min_delta-spinner').val(value);
		});

        GUI.content_ready(callback);

    });

};

TABS.settings.cleanup = function (callback) {
    console.log("cleanup config");
    if (callback)
        callback();
};


