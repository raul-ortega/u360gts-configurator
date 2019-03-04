$.get('https://api.github.com/repos/iNavFlight/inav/releases', function (releasesData){
            TABS.firmware_flasher.releasesData = releasesData;
            buildBoardOptions();

            // bind events
            $('select[name="board"]').change(function() {

                $("a.load_remote_file").addClass('disabled');
                var target = $(this).val();

                console.log(target, limitedFunctionalityTargets.indexOf(target));

                if (limitedFunctionalityTargets.indexOf(target) >= 0) {
                    $('.limited-functionality-warning').show();
                } else {
                    $('.limited-functionality-warning').hide();
                }

                if (!GUI.connect_lock) {
                    $('.progress').val(0).removeClass('valid invalid');
                    $('span.progressLabel').text(chrome.i18n.getMessage('firmwareFlasherLoadFirmwareFile'));
                    $('div.git_info').slideUp();
                    $('div.release_info').slideUp();
                    $('a.flash_firmware').addClass('disabled');

                    var versions_e = $('select[name="firmware_version"]').empty();
                    if(target == 0) {
                        versions_e.append($("<option value='0'>{0}</option>".format(chrome.i18n.getMessage('firmwareFlasherOptionLabelSelectFirmwareVersion'))));
                    } else {
                        versions_e.append($("<option value='0'>{0} {1}</option>".format(chrome.i18n.getMessage('firmwareFlasherOptionLabelSelectFirmwareVersionFor'), target)));
                    }

                    TABS.firmware_flasher.releases[target].forEach(function(descriptor) {
                        var select_e =
                                $("<option value='{0}'>{0} - {1} - {2} ({3})</option>".format(
                                        descriptor.version,
                                        descriptor.target,
                                        descriptor.date,
                                        descriptor.status
                                )).data('summary', descriptor);

                        versions_e.append(select_e);
                    });
                }
            });

        }).fail(function (data){
            if (data["responseJSON"]){
                GUI.log("<b>GITHUB Query Failed: <code>{0}</code></b>".format(data["responseJSON"].message));
            }
            $('select[name="release"]').empty().append('<option value="0">Offline</option>');
        });