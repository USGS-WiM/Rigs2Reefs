//Copyright 2013 USGS Wisconsin Internet Mapping(WiM)
//Author: WiM JS Dev Team
//Created: May 17th, 2013	

//This template has been commented heavily for development purposes. Please delete comments before publishing live mapper code.
//Below are all the dojo.require statements needed for this template mapper. These statements import esri and dijit out-of-box functionality. At bottom are custom wimjits being included.
//This list will vary as features are added to mappers and different Dojo, Esri, or WiM tools are used. 

//07.16.2013 - NE - Add functionality for adding icon and execute zoom to scale.
//06.19.2013 - NE - Updated to create lat/lng scale bar programmatically after map is created and ready.
//06.18.2013 - TR - Added color style to USGSLinks <a> tags
//06.03.2013 - ESM - Adds function to build and display usgs links on user logo click

dojo.require("esri.arcgis.utils");
dojo.require("esri.dijit.Popup");
dojo.require("esri.dijit.Legend");
dojo.require("esri.dijit.BasemapGallery");
dojo.require("esri.graphic");
dojo.require("esri.map");
dojo.require("esri.tasks.locator");
dojo.require("esri.virtualearth.VETiledLayer");

dojo.require("dijit.form.CheckBox");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.TitlePane");
dojo.require("dijit.Tooltip");

dojo.require("wim.CollapsingContainer");
dojo.require("wim.ExtentNav");
dojo.require("wim.LatLngScale");


//various global variables are set here (Declare here, instantiate below)     
var map, layerArray = [];
var legendLayers = [];
var allLayers;
var identifyTask, identifyParams;
var navToolbar;
var locator;
     
function init() {
	//sets up the onClick listener for the USGS logo
	dojo.connect(dojo.byId("bseeLogo"), "onclick", showUSGSLinks);
	
	// a popup is constructed below from the dijit.Popup class, which extends some addtional capability to the InfoWindowBase class.
	var popup = new esri.dijit.Popup({},dojo.create("div"));
	
	//IMPORANT: map object declared below. Basic parameters listed here. 
	//String referencing container id for the map is required (in this case, "map", in the parens immediately following constructor declaration).
	//Default basemap is set using "basemap" parameter. See API reference page, esri.map Constructor Detail section for parameter info. 
	//For template's sake, extent parameter has been set to contiguous US.
	//sliderStyle parameter has been commented out. Remove comments to get a large slider type zoom tool (be sure to fix CSS to prevent overlap with other UI elements)
	//infoWindow parameter sets what will be used as an infoWindow for a map click. 
	//If using FeatureLayer,an infoTemplate can be set in the parameters of the FeatureLayer constructor, which will automagically generate an infoWindow.	 
	map = new esri.Map("map", {
    	basemap: "oceans",
		wrapAround180: true,
		extent: new esri.geometry.Extent({xmin:-11426418.484291442,ymin:2771912.393732911,xmax:-9080718.960276585,ymax:3783327.1520020897,spatialReference:{wkid:102100}}), 
		slider: true,
		sliderStyle: "small", //use "small" for compact version
		logo:false,
		infoWindow: popup
	});
	
	//navToolbar constructor declared, which serves the extent navigator tool.
    navToolbar = new esri.toolbars.Navigation(map);
	
	//dojo.connect method (a common Dojo framework construction) used to call mapReady function. Fires when the first or base layer has been successfully added to the map.
    dojo.connect(map, "onLoad", mapReady);
	
	//basemapGallery constructor which serves the basemap selector tool. List of available basemaps can be customized. Here,default ArcGIS online basemaps are set to be available.
	var basemapGallery = new esri.dijit.BasemapGallery({
		showArcGISBasemaps: true,
		map: map
	}, "basemapGallery");
	basemapGallery.startup();
	
	//basemapGallery error catcher
	dojo.connect(basemapGallery, "onError", function() {console.log("Basemap gallery failed")});
	
	//calls the executeSiteIdentifyTask function from a click on the map. 
	dojo.connect(map, "onClick", executeSiteIdentifyTask);
	
	//This object contains all layer and their ArcGIS and Wim specific mapper properties
	allLayers = {
			"Bathymetry" : {
				"url": "http://www.csc.noaa.gov/ArcGISPUB/rest/services/MarineCadastre/PhysicalOceanographicAndMarineHabitat/MapServer", 
				"visibleLayers": [7], 
				"arcOptions": {
					"visible": true, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Oil and natural gas wells" : {
				"url": "http://gis.boemre.gov/arcgis/rest/services/BOEM_BSEE/MMC_Layers/MapServer", 
				"visibleLayers": [1], 
				"arcOptions": {
					"visible": false, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Selected pipelines" : {
				"url": "http://gis.boemre.gov/arcgis/rest/services/BOEM_BSEE/MMC_Layers/MapServer", 
				"visibleLayers": [2], 
				"arcOptions": {
					"visible": false, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Shipping fairways, lanes and zones" : {
				"url": "http://www.csc.noaa.gov/ArcGISPUB/rest/services/MarineCadastre/NavigationAndMarineTransportation/MapServer", 
				"visibleLayers": [5], 
				"arcOptions": {
					"visible": false, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Artifical reefs" : {
				"url": "http://www.csc.noaa.gov/ArcGISPUB/rest/services/MarineCadastre/PhysicalOceanographicAndMarineHabitat/MapServer",
				"visibleLayers": [0], 
				"arcOptions": {
					"visible": false, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Maritime boundaries" : {
				"url": "http://maritimeboundaries.noaa.gov/arcgis/rest/services/MaritimeBoundaries/US_Maritime_Limits_Boundaries/MapServer",
				"visibleLayers": [1,2,3], 
				"arcOptions": {
					"visible": true, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "REFERENCE": {
				"wimOptions": {
					"type": "heading",
					"includeInLayerList": true
				}
			}, "Platforms" : {
				"url": "http://gis.boemre.gov/arcgis/rest/services/BOEM_BSEE/MMC_Layers/MapServer",
				"visibleLayers": [0], 
				"arcOptions": {
					"visible": false, 
					"opacity": 1.0
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Idle iron" : {
				"url": "http://commons.wim.usgs.gov/arcgis/rest/services/Rigs2Reefs/platforms/MapServer",
				"visibleLayers": [2],
				"arcOptions": {
					"id": "idleIron",
					"opacity": 1.0,
					"visible": false
				},
				"wimOptions": {
					"id": "expired",
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Non-idle" : {
				"url": "http://commons.wim.usgs.gov/arcgis/rest/services/Rigs2Reefs/platforms/MapServer",
				"visibleLayers": [0],
				"arcOptions": {
					"id": "nonIdle",
					"opacity": 1.0,
					"visible": false
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "Expired" : {
				"url": "http://commons.wim.usgs.gov/arcgis/rest/services/Rigs2Reefs/platforms/MapServer",
				"visibleLayers": [1],
				"arcOptions": {
					"id": "expired",
					"opacity": 1.0,
					"visible": true
				},
				"wimOptions": {
					"type": "layer",
					"includeInLayerList": true
				}
			}, "PLATFORMS": {
				"wimOptions": {
					"type": "heading",
					"includeInLayerList": true
				}
			}
		};
		
	
	//this function fires after all layers have been added to map with the map.addLayers method above.
	//this function creates the legend element based on the legendLayers array which contains the relevant data for each layer. 
	dojo.connect(map,'onLayersAddResult',function(results){
		var legend = new esri.dijit.Legend({
			map:map,
			layerInfos:legendLayers
		},"legendDiv");
		legend.startup();
		
		//this counter to track first and last of items in legendLayers
		var i = 0;
		var lastItem = legendLayers.length;
		//this forEach loop generates the checkbox toggles for each layer by looping through the legendLayers array (same way the legend element is generated). 
		dojo.forEach (legendLayers, function(layer){
			if (layer.layer != "groupLayer") {
				var layerName = layer.title;
				var checkBox = new dijit.form.CheckBox({
					name:"checkBox" + layer.layer.id,
					value:layer.layer.id,
					checked:layer.layer.visible,
					onChange:function(evt){
						var checkLayer = map.getLayer(this.value);
						checkLayer.setVisibility(!checkLayer.visible);
						this.checked = checkLayer.visible;						
					}
				});
				if (layer.zoomScale) {
					//create the holder for the checkbox and zoom icon
					var toggleDiv = dojo.doc.createElement("div");
					dojo.place(toggleDiv,dojo.byId("toggle"),"after");
					dojo.place(checkBox.domNode,toggleDiv,"first");
					var checkLabel = dojo.create('label',{'for':checkBox.name,innerHTML:layerName},checkBox.domNode,"after");
					var scale = layer.zoomScale;
					var zoomImage = dojo.doc.createElement("div");
					zoomImage.id = 'zoom' + layer.layer.id;
					zoomImage.innerHTML = '<img id="zoomImage" style="height: 18px;width: 18px" src="images/zoom.gif" />';
					dojo.connect(zoomImage, "click", function() {
						if (map.getScale() > scale) {
							map.setScale(scale);;
						}
					});
					dojo.place(zoomImage,toggleDiv,"last");
					dojo.setStyle(checkBox.domNode, "float", "left");
					dojo.setStyle(toggleDiv, "paddingLeft", "15px");
					dojo.setStyle(checkLabel, "float", "left");
					dojo.setStyle(toggleDiv, "paddingTop", "5px");
					dojo.setStyle(dojo.byId("zoomImage"), "paddingLeft", "10px");
					dojo.setStyle(toggleDiv, "height", "25px");
					if (i == 0) {
						dojo.setStyle(toggleDiv, "paddingBottom", "10px");
					} else if (i == lastItem) {
						dojo.setStyle(toggleDiv, "paddingTop", "10px");
					}
					dojo.place("<br/>",zoomImage,"after");
				} else {
					var toggleDiv = dojo.doc.createElement("div");
					dojo.place(toggleDiv,dojo.byId("toggle"),"after");
					dojo.place(checkBox.domNode,toggleDiv,"first");
					dojo.setStyle(toggleDiv, "paddingLeft", "15px");
					if (i == 0) {
						dojo.setStyle(toggleDiv, "paddingBottom", "10px");
					} else if (i == lastItem) {
						dojo.setStyle(toggleDiv, "paddingTop", "10px");
					}
					var checkLabel = dojo.create('label',{'for':checkBox.name,innerHTML:layerName},checkBox.domNode,"after");
					dojo.place("<br/>",checkLabel,"after");
				}
			} else {
				var headingDiv = dojo.doc.createElement("div");
				headingDiv.innerHTML = layer.title;
				dojo.place(headingDiv,dojo.byId("toggle"),"after");
				dojo.setStyle(headingDiv, "paddingTop", "10px");
				dojo.setStyle(headingDiv, "color", "#D3CFBA");
				if (i == 0) {
					dojo.setStyle(headingDiv, "paddingBottom", "10px");
				} else if (i == lastItem) {
					dojo.setStyle(headingDiv, "paddingTop", "10px");
				}
			}
			i++;
		});
	});
	
	addAllLayers();
	
	//OPTIONAL: the below remaining lines within the init function are for performing an identify task on a layer in the mapper. 
	// the following 7 lines establish an IdentifyParameters object(which is an argument for an identifyTask.execute method)and specifies the criteria used to identify features. 
	// the constructor of the identifyTask is especially important. the service URL there should match that of the layer from which you'd like to identify.
	identifyParams = new esri.tasks.IdentifyParameters();
    identifyParams.tolerance = 15;
    identifyParams.returnGeometry = true;
    identifyParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_ALL;
    identifyParams.width  = map.width;
    identifyParams.height = map.height;
    identifyTask = new esri.tasks.IdentifyTask(allLayers["Expired"].url);

	//OPTIONAL: the following function carries out an identify task query on a layer and returns attributes for the feature in an info window according to the 
	//InfoTemplate defined below. It is also possible to set a default info window on the layer declaration which will automatically display all the attributes 
	//for the layer in the order they come from the table schema. This code below creates custom labels for each field and substitutes in the value using the notation ${[FIELD NAME]}. 
    function executeSiteIdentifyTask(evt) {
        identifyParams.geometry = evt.mapPoint;
        identifyParams.mapExtent = map.extent;
        
        var layerIds = [];
        
        if (map.getLayer("nonIdle").visible == true) {
        	layerIds.push(0);
        }
        if (map.getLayer("expired").visible == true) {
        	layerIds.push(1);
        }
        if (map.getLayer("idleIron").visible == true) {
        	layerIds.push(2);
        }
        
        identifyParams.layerIds = layerIds;
        
        // the deferred variable is set to the parameters defined above and will be used later to build the contents of the infoWindow.
        
        var deferredResult;
        if (layerIds.length != 0) {
        	deferredResult = identifyTask.execute(identifyParams);
		}
        
        deferredResult.addCallback(function(response) {     
            // response is an array of identify result objects    
            // dojo.map is used to set the variable feature to each result in the response array and apply the same template to each of those features, 
            return dojo.map(response, function(result) {
                var feature = result.feature;
                feature.attributes.layerName = result.layerName;
                var layerId = result.layerId;
                var layerName = result.layerName;
                
				//set the customized template for displaying content in the info window. HTML tags can be used for styling.
				// The string before the comma within the parens immediately following the constructor sets the title of the info window.
				// Identify works on three different layers with the service so selection of the appropriate template happens here
				var template;
				if (layerId == 0) {
	                template = new esri.InfoTemplate("<b>Non-idle</b>",
	                	"<b>Complex ID</b>: ${COMPLEX_ID}<br/>" +
	                	"<b>Area code</b>: ${AREA_CODE}<br/>" +
						"<b>Block number</b>: ${BLOCK_NUMB}<br/>" +
						"<b>Structure type</b>: ${STRUC_TYPE}<br/>" +
	                    "<b>Last revision</b>: ${LAST_REV_D}<br/>" +
						"<b>Comments</b>: ${COMMENTS}<br/>" +
						"<p><a href='javascript:feedback(${COMPLEX_ID})'>Submit feedback for this site</a></p>");
				} else if (layerId == 1) {
					template = new esri.InfoTemplate("<b>Expired</b>",
						"<b>Complex ID</b>: ${COMPLEX_ID}<br/>" +
	                	"<b>Structure type</b>: ${STRUC_TYPE}<br/>" +
	                    "<b>Legs count</b>: ${LEGS_COUNT}<br/>" +
						"<p><a href='javascript:feedback(${COMPLEX_ID})'>Submit feedback for this site</a></p>");
				} else if (layerId == 2) {
					template = new esri.InfoTemplate("<b>Idle iron</b>",
						"<b>Complex ID</b>: ${COMPLEX_ID}<br/>" +
	                	"<b>Structure type</b>: ${STRUC_TYPE}<br/>" +
	                    "<b>Legs count</b>: ${LEGS_COUNT}<br/>" +
						"<p><a href='javascript:feedback(${COMPLEX_ID})'>Submit feedback for this site</a></p>");
				}
					
				//ties the above defined InfoTemplate to the feature result returned from a click event	
                feature.setInfoTemplate(template);
                
				//returns the value of feature, which is the result of the click event
                return feature;
            });
        });
		
        //sets the content that informs the info window to the previously established "deferredResult" variable.
	    map.infoWindow.setFeatures([ deferredResult ]);
		//tells the info window to render at the point where the user clicked. 
		map.infoWindow.show(evt.mapPoint);
    }
	//end executeSiteIdentifyTask method
	  
	//Geocoder reference to geocoding services
    locator = new esri.tasks.Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");
	//calls the function that does the goeocoding logic (found in geocoder.js, an associated JS module)*
    dojo.connect(locator, "onAddressToLocationsComplete", showResults);
	
}
//end of init function	

//mapReady function that fires when the first or base layer has been successfully added to the map. Very useful in many situations. called above by this line: dojo.connect(map, "onLoad", mapReady)
function mapReady(map){ 	
	//Sets the globe button on the extent nav tool to reset extent to the initial extent.
	dijit.byId("extentSelector").set("initExtent", map.extent);  
	
	//Create scale bar programmatically because there are some event listeners that can't be set until the map is created.
	//Just uses a simple div with id "latLngScaleBar" to contain it
	var latLngBar = new wim.LatLngScale({map: map}, 'latLngScaleBar');

}

function addAllLayers() {
		
	for (layer in allLayers) {
		if (allLayers[layer].wimOptions.type != "heading") {
			console.log(layer);
			var newLayer = new esri.layers.ArcGISDynamicMapServiceLayer(allLayers[layer].url, allLayers[layer].arcOptions);
			if (allLayers[layer].visibleLayers) {
				newLayer.setVisibleLayers(allLayers[layer].visibleLayers);
			}
			
			//set wim options
			if (allLayers[layer].wimOptions) {
				if (allLayers[layer].wimOptions.includeInLayerList == true) {
					legendLayers.push({layer: newLayer, title: layer});
				}
			} else {
				legendLayers.push({layer: newLayer, title: layer});
			}
			layerArray.push(newLayer);
		} else {
			legendLayers.push({layer: "groupLayer", title: layer});
		}
	}
	
	map.addLayers(layerArray);
	
}

// function to show feedback form when a user click to submit feedback on a site
function feedback(complexID) {
	dojo.byId("formDiv").innerHTML = '<div id="feedbackInfo">Submit comments here for site ID: <label id="feedbackID">1234</label></div><form><label for="emailInput">email: </label><br><input type="email" required name="email" id="emailInput" class="feedbackInput"/><br><label for="commentsInput">comments: </label><br><textarea id="commentsInput" rows="5" cols="25" required></textarea><br><div id="feedbackButtons"><button type="button" onclick="showFeedbackResult()" id="submitButton">Submit</button><button type="button" onclick="cancelFeedback()" title="Cancel" id="cancelButton">Cancel</button></div></form>';
	dojo.byId("feedbackID").innerHTML = complexID;
	//dojo.style(dojo.byId("submittedInfo"),"visibility","hidden");
	//dojo.style(dojo.byId("formDiv"),"visibility","visible");
	dojo.style(dojo.byId("feedbackForm"),"visibility","visible");
}

function showFeedbackResult() {
	//http request to email service
	var to = "njestes@usgs.gov" // add new emails separated by semi-colons
	var subject = "Feedback for site ID: " + $("#feedbackID").html();
	var body = $("#commentsInput")[0].value;
	$.get("proxies/httpProxy/Default.aspx?from=no-reply@bsee.gov&to="+to+"&subject="+subject+"&body="+body, function() {
		dojo.byId("formDiv").innerHTML = '<div id="submittedDiv"><div id="submittedInfo">Thanks for the feedback!<br><div id="closeButtonDiv"><button type="button" onclick="cancelFeedback()" title="Cancel" id="closeButton">Close</button></div></div></div>';
	}).fail(function() {
		alert('error with submission');
	});
}

function cancelFeedback() {
	//dojo.style(dojo.byId("submittedInfo"),"visibility","hidden");
	dojo.style(dojo.byId("feedbackForm"),"visibility","hidden");
}

// USGS Logo click handler function
function showUSGSLinks(evt){
	//check to see if there is already an existing linksDiv so that it is not build additional linksDiv. Unlikely to occur since the usgsLinks div is being destroyed on mouseleave.
	if (!dojo.byId('usgsLinks')){
		//create linksDiv
		var linksDiv = dojo.doc.createElement("div");
		linksDiv.id = 'usgsLinks';
		//LINKS BOX HEADER TITLE HERE
		linksDiv.innerHTML = '<div class="usgsLinksHeader"><b>USGS Links</b></div>';
		//USGS LINKS GO HERE
		linksDiv.innerHTML += '<p>';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/">USGS Home</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/ask/">Contact USGS</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://search.usgs.gov/">Search USGS</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/accessibility.html">Accessibility</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/foia/">FOIA</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/privacy.html">Privacy</a><br />';
		linksDiv.innerHTML += '<a style="color:white" target="_blank" href="http://www.usgs.gov/laws/policies_notices.html">Policies and Notices</a></p>';
		
		//place the new div at the click point minus 5px so the mouse cursor is within the div
		linksDiv.style.top =  evt.clientY-5 + 'px';
		linksDiv.style.left = evt.clientX-5 + 'px';
		
		//add the div to the document
		dojo.byId('map').appendChild(linksDiv);
		//on mouse leave, call the removeLinks function
		dojo.connect(dojo.byId("usgsLinks"), "onmouseleave", removeLinks);

	}
}

//remove (destroy) the usgs Links div (called on mouseleave event)
function removeLinks(){
	dojo.destroy('usgsLinks');
}

dojo.ready(init);
//IMPORTANT: while easy to miss, this little line above makes everything work. it fires when the DOM is ready and all dojo.require calls have been resolved. 
//Also when all other JS has been parsed, as it lives here at the bottom of the document. Once all is parsed, the init function is executed*