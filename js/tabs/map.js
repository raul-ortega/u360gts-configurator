window.addEventListener('message', function (e) {
    var mainWindow = e.source;
    var result = '';
    try {
        switch (e.data.action) {
            case 'zoom_in':
                var zoom = map.getZoom();
                zoom++;
                map.setZoom(zoom);
                break;
            case 'zoom_out':
                var zoom = map.getZoom();
                zoom--;
                map.setZoom(zoom);
                break;
            case 'center':
                map.setCenter(new google.maps.LatLng(e.data.lat, e.data.lon));
                marker.setPosition(new google.maps.LatLng(e.data.lat, e.data.lon));
                map.panTo(new google.maps.LatLng(e.data.lat, e.data.lon));
        }
    } catch (e) {
        console.log('message error');
    }
});

function loadMapScript() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true&callback=initialize';
    document.head.appendChild(script);
}

window.onload = loadMapScript;

var map;
var marker;
var circle;

function zoom_in() {
    var zoom = map.getZoom();
    zoom++;
    map.setZoom(zoom);
}

function initialize() {

    var mapOptions = {
        zoom: 17,
        zoomControl: false,
        streetViewControl: false,
        center: {lat: 47.403583, lng: 8.535850}
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    var image = {
        url: '/images/icons/cf_icon_position.png',
        scaledSize: new google.maps.Size(40, 40)
    };

    var icon = {
        url: '/images/icons/cf_icon_yaw.svg',
        size: new google.maps.Size(40, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(40 / 2, 40 / 2)
    };

    circle = new google.maps.Circle({
        center: {lat: 47.403583, lng: 8.535850},
        radius: 20,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        map: map
    });

    marker = new google.maps.Marker({
        icon: image,
        position: new google.maps.LatLng(47.403583, 8.535850),
        map: map
    });

    var infowindow = new google.maps.InfoWindow();

    google.maps.event.addListener(marker, 'click', function () {
        infowindow.setContent('<p>Your Location: ' + map.getCenter() + '</p>');
        infowindow.open(map, marker);
    });

    window.addEventListener('message', function (e) {
        var data = e.data;
        var origin = e.origin;
    });
}

