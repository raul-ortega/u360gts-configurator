

$(function() {
	
	/*var click = new OpenLayers.Control.Click();
	mapHandler.addControl(click);
	click.activate();
	OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {               
		defaultHandlerOptions: {
			'single': true,
			'double': false,
			'pixelTolerance': 0,
			'stopSingle': false,
			'stopDouble': false
		},

		initialize: function(options) {
		this.handlerOptions = OpenLayers.Util.extend(
			{}, this.defaultHandlerOptions
		);
		OpenLayers.Control.prototype.initialize.apply(
			this, arguments
		);
		this.handler = new OpenLayers.Handler.Click(
			this, {
				'click': this.trigger
			}, this.handlerOptions
		);
		},

		trigger: function(e) {
		var lonlat = map.getLonLatFromPixel(e.xy);
		lonlat1= new OpenLayers.LonLat(lonlat.lon,lonlat.lat).transform(toProjection,fromProjection);
		alert("Hello..."+lonlat1.lon + "  " +lonlat1.lat);

		}

	});*/
	
	/*$("#map-canvas").on('click',function(e){
		var point = mapHandler.getCoordinateFromPixel([e.clientX,e.clientY]);
		var offset = Math.floor((point[0] / 40075016.68) + 0.5);
		console.log("test");
	});*/
});