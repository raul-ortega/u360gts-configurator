// create a layer with the OSM source
var layer = new ol.layer.Tile({
    source: new ol.source.OSM()
});

// center on london, transforming to map projection
var center = ol.proj.transform([8.535850, 47.403583], 'EPSG:4326', 'EPSG:3857');

// view, starting at the center
var view = new ol.View({
    center: center,
    zoom: 15
});

var iconFeatures = [];

var iconFeature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.transform([8.535850, 47.403583], 'EPSG:4326', 'EPSG:3857')),
    name: 'Tracker'
});

iconFeatures.push(iconFeature);

var iconStyle = new ol.style.Style({
    image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
        anchor: [1, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 0.15,
        src: '/images/icons/tracker-map-icon.png'
    }))
});

var vectorSource = new ol.source.Vector({
    features: iconFeatures //add an array of features
});

var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: iconStyle
});

// finally, the map with our custom interactions, controls and overlays
var map = new ol.Map({
    target: 'map',
    layers: [layer, vectorLayer],
    view: view
});


window.addEventListener('message', function (e) {
    var data = e.data;
    var origin = e.origin;
});

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
                iconFeature.setGeometry(new ol.geom.Point(ol.proj.transform([e.data.lon, e.data.lat], 'EPSG:4326', 'EPSG:3857')));
                view.setCenter(ol.proj.transform([e.data.lon, e.data.lat], 'EPSG:4326', 'EPSG:3857'));
        }
    } catch (e) {
        console.log('message error');
    }
});

//addMarker(8.535850, 47.403583);

//function loadMapScript() {
//    var script = document.createElement('script');
//    script.type = 'text/javascript';
//    script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true&callback=initialize';
//    document.head.appendChild(script);
//}
//
//window.onload = loadMapScript;
//
//var map;
//var marker;
//var circle;
//
//function zoom_in() {
//    var zoom = map.getZoom();
//    zoom++;
//    map.setZoom(zoom);
//}
//
//function initialize() {
//
//    var mapOptions = {
//        zoom: 17,
//        zoomControl: false,
//        streetViewControl: false,
//        center: {lat: 47.403583, lng: 8.535850}
//    };
//    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
//
//    var image = {
//        url: '/images/icons/tracker-map-icon.png',
//        scaledSize: new google.maps.Size(40, 40),
//        origin: new google.maps.Point(0, 0),
//        anchor: new google.maps.Point(40 / 2, 40 / 2)
//    };
//
//    var icon = {
//        url: '/images/icons/tracker-map-icon.png',
//        size: new google.maps.Size(40, 40),
//        origin: new google.maps.Point(0, 0),
//        anchor: new google.maps.Point(40 / 2, 40 / 2)
//    };
//
//    circle = new google.maps.Circle({
//        center: {lat: 47.403583, lng: 8.535850},
//        radius: 20,
//        strokeColor: "#FF0000",
//        strokeOpacity: 0.8,
//        strokeWeight: 2,
//        fillColor: "#FF0000",
//        fillOpacity: 0.35,
//        map: map
//    });
//
//    marker = new google.maps.Marker({
//        icon: image,
//        position: new google.maps.LatLng(47.403583, 8.535850),
//        map: map
//    });
//
//    var infowindow = new google.maps.InfoWindow();
//
//    google.maps.event.addListener(marker, 'click', function () {
//        infowindow.setContent('<p>Your Location: ' + map.getCenter() + '</p>');
//        infowindow.open(map, marker);
//    });
//
//    window.addEventListener('message', function (e) {
//        var data = e.data;
//        var origin = e.origin;
//    });
//}

