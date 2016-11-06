var currentMarker;
var estimatedMarker;

window.addEventListener('message', function (e) {
       var mainWindow = e.source;
       var result = '';
       try {
         switch(e.data.action){
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
              /*map.setCenter(new google.maps.LatLng(e.data.lat, e.data.lon));
              marker.setPosition( new google.maps.LatLng( e.data.lat, e.data.lon ) );
              map.panTo( new google.maps.LatLng( e.data.lat, e.data.lon ) );*/
			  processData(e.data.line);
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
     function initialize() {
       var mapOptions = {
         zoom: 17,
         zoomControl: false,
         streetViewControl: false,
         center: {lat: 47.403583, lng: 8.535850}
       };
       map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
       var image = {
         url: '../images/icons/cf_icon_position.png',
         scaledSize: new google.maps.Size(70, 70)
       };
      
       marker = new google.maps.Marker({
         icon : image,
         position: new google.maps.LatLng(53.570645, 10.001362),
         map:map
       });
    
  // You can use a LatLng literal in place of a google.maps.LatLng object when
  // creating the Marker object. Once the Marker object is instantiated, its
  // position will be available as a google.maps.LatLng object. In this case,
  // we retrieve the marker's position using the
  // google.maps.LatLng.getPosition() method.
       var infowindow = new google.maps.InfoWindow({
         content: '<p>Your Location: ' + marker.getPosition() + '</p>'
       });
       google.maps.event.addListener(marker, 'click', function() {
         infowindow.open(map, marker);
       });
  
       window.addEventListener('message', function(e) {
         var data = e.data;
         var origin = e.origin;
       });
}

function parseData(line){
	console.log("data: " + data);
	/*$("#cli-reciever").append(line+'<br/>');
	$("#cli-reciever").scrollTop($('#cli-reciever')[0].scrollHeight);*/
	getLatLon(line);
}
function processData(data){
	var record = data.split(",");
	var coordType = record[0];
	var lat = record[2];
	var lon = record[3];
	if(coordType == '1'){
		placeMarkerCurrentPosition(lat,lon);
	} else {
		placeMarkerEstimatedPosition(lat,lon);
	}
	
	
}

function placeMarkerCurrentPosition(lat,lon){
	var newLatLng = new google.maps.LatLng(lat,lon);
	if (typeof currentMarker == 'undefined'){
		currentMarker = new google.maps.Marker({
			position: newLatLng,
			map: map,
			icon: 'http://maps.google.com/mapfiles/marker_green.png'
		});
	} else {
		map.setCenter(new google.maps.LatLng(lat,lon));
		currentMarker.setPosition( new google.maps.LatLng(lat,lon ) );
		//map.panTo( new google.maps.LatLng(lat,lon ) );
	}
}
function placeMarkerEstimatedPosition(lat,lon){
var newLatLng = new google.maps.LatLng(lat,lon);
	if (typeof estimatedMarker == 'undefined'){
		estimatedMarker = new google.maps.Marker({
			position: newLatLng,
			map: map,
			icon: 'http://maps.google.com/mapfiles/marker.png'
		});
	} else {
		map.setCenter(new google.maps.LatLng(lat,lon));
		estimatedMarker.setPosition( new google.maps.LatLng(lat,lon ) );
		//map.panTo( new google.maps.LatLng(lat,lon ) );
	}
}