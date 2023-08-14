//Script by Jessica Steslow for Lab 2

//Backup JS file following module tutorials, before modifications to fix errors

//wrap everything in an anonymous function which is immediately invoked
//also prevents items in this JS file being in global scope
(function(){

          //pseudo-global variables
          var attrArray = [   //list of attributes in the csv file
              "% Registered as Democratic",
              "% Registered as Other",
              "% Registered as Republican",
              "Active VRP Sites",
              "Average Household Income",
              "Drinking Water Contaminants Exceeding Federal Limit",
              "Hazardous Waste Large Quantity Generators",
              "Hazardous Waste Remediation Sites",
              "Leaking UST Sites",
              "Population",
              "Provisionally Impaired Water Bodies",
              "Superfund Sites"];

          var expressed = attrArray[5]; //initial attribute. I chose [5] for better numbers to work with

          const waterSet = new Set (
              ["Provisionally Impaired Water Bodies", 
              "Drinking Water Contaminants Exceeding Federal Limit"]);
          const wasteSet = new Set (
              ["Active VRP Sites", 
              "Hazardous Waste Large Quantity Generators", 
              "Hazardous Waste Remediation Sites", 
              "Leaking UST Sites", 
              "Superfund Sites"]);
          const demSet = new Set (
              ["% Registered as Democratic",
              "% Registered as Other",
              "% Registered as Republican",
              "Average Household Income",
              "Population"]);

          //pseudo-global height and width based on window size
          var mapWidth = 0;
            if(window.innerWidth <= 800) {mapWidth = 800*0.425}
              else if(window.innerWidth >= 1400) {mapWidth = 600} 
              else {mapWidth = window.innerWidth*0.425};
          var mapHeight = mapWidth;


  //begin script when window loads
  window.onload = setBaseMap();

  //set up choropleth map
  function setBaseMap(){

      //create new svg container for the map
      var basemap = d3.select("#mapdiv")
          .append("svg")
          .attr("class", "basemap")
          .attr("width", mapWidth)
          .attr("height", mapHeight);

      //create Azimuthal equal area conic projection centered on Arizona, USA
      var projection = d3.geoAzimuthalEqualArea()
          .center([0, 34.2])
          .rotate([112,0,0])
          .scale(mapWidth*10) //5500 preferred static scale, width*10 is a happy coincidence
          .translate([mapWidth/2, mapHeight/2]);

      //create the path generator
      var path = d3.geoPath().projection(projection);

      //use Promise.all to parallelize asynchronous data loading
      var promises = [d3.csv("data/EnvironmentalPerAZCounty.csv"),
                      d3.json("data/AZcounties.topojson"),
                      d3.json("data/Mexicostates.topojson"),
                      d3.json("data/USstates.topojson")];
      Promise.all(promises).then(callback);

      function callback(data){
          var csvData = data[0], counties = data[1], mexico = data[2], states = data[3];
          
          /*console.log(csvData);
          console.log(counties);  //helpful to log these to confirm object name
          console.log(mexico);    //object name used below in topojson.feature()
          console.log(states);*/

          //setGraticule(basemap,path); //may use graticule for small scale locater map

          //translate TopoJSON to GeoJSON
          //.features used for geojson for individual data and styling (the choropleth data)
          var azCounties = topojson.feature(counties, counties.objects.AZcounties).features,
              //slightly different formatting for base data
              mexicoBoundary = topojson.feature(mexico, mexico.objects.Mexicostates_PD), //PD for pairwise dissolve
              statesBoundary = topojson.feature(states, states.objects.USstates_PD);
              //azBoundary = topojson.feature(counties, counties.objects.AZcounties);

              //helpful to log these to confirm data type change
              //console.log(csvData); console.log(counties); console.log(mexico);

          //add base data to map with append
          var mapMexico = basemap.append("path")
              .datum(mexicoBoundary)
              .attr("class", "mexico")
              .attr("d", path);

          var mapStates = basemap.append("path")
              .datum(statesBoundary)
              .attr("class", "states")
              .attr("d", path);

          /*
          //using same topogjson for AZ counties to create a border around the state of AZ
          var mapAZBoundary = basemap.append("path")
            .datum(azBoundary)
            .attr("class", "az-border")
            .attr("d", path);
            */

          azCounties = joinData(azCounties, csvData)

          //create the color and y scales
          var colorScale = makeColorScale(csvData);
          var yScale = makeYScale(csvData);

          setEnumerationUnits(azCounties, basemap, path, colorScale);

          //add coordinated visualization to the map
          setChart(csvData, colorScale, yScale);

          //add dropdown menu
          createDropdown(csvData);
      };
  };

  /*function setGraticule (basemap, path){
    //graticule likely not needed for large scale map, it's here in case I use it later
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every X degrees of longitude and latitude

    //create graticule background
    var gratBackground = basemap.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path); //project graticule

    //create graticule lines
    var gratLines = basemap.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
  }; */

  function joinData(azCounties, csvData){
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i < csvData.length; i++){
      var csvCounty = csvData[i]; //the current region
      var csvKey = csvCounty.NAME; //the csv primary key

      //loop through geojson regions to find correct region
      for (var a=0; a < azCounties.length; a++){
        var geojsonProps = azCounties[a].properties; //the current region geojson properties
        var geojsonKey = geojsonProps.NAME; //the geojson primary key
        

        //where primary keys match, transfer csv data to geojson properties object
        if (geojsonKey == csvKey){
          //assign all attributes and values
          attrArray.forEach(function(attr){
            var val = parseFloat(csvCounty[attr]); //get csv attribute value
            geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
        };
      };
    };
    return azCounties;
  };

  function makeAttributeArray(data) {
      //build array of all values of the expressed attribute
      var domainArray = [];
      for (var i = 0; i < data.length; i++){
          var val = parseFloat(data[i][expressed]);
          domainArray.push(val);
      };
      return domainArray;
  };

  function makeYScale(data) {
    var domainArray = makeAttributeArray(data);
    var yMax = domainArray.sort(function(a, b){return b - a})[0]

    //unique scale for Population, otherwise linear
    if (expressed == "Population") var yScale = d3.scaleLog([1,mapHeight],[0,yMax/30000]);
    else var yScale = d3.scaleLinear().range([0,mapHeight]).domain([0,yMax*1.1]);
    
    return yScale;
  };

  //function to create color scale generator. light to dark
  function makeColorScale(data){

    if (waterSet.has(expressed)==true) {
      var colorClasses = ["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd"];
    } else if (wasteSet.has(expressed)==true) {
      var colorClasses = ["#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#107F39"];
    } else if (demSet.has(expressed)==true) {
      var colorClasses = ["#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02"];
    } else {
      var colorClasses = ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1"];
    }
    
    //create color scale generator
    var colorScale = d3.scaleQuantile().range(colorClasses);
    //assign array of expressed values as scale domain
    colorScale.domain(makeAttributeArray(data));
    return colorScale;
  };

  function setEnumerationUnits(azCounties, basemap, path, colorScale){
    //add data to apply choropleth later with selectAll
    var mapCounties = basemap.selectAll(".mapCounties")
        .data(azCounties)
        .enter()
        .append("path")
        .attr("class", function(d){return "AZ " + d.properties.NAME;})
        .attr("d", path)
        .style("fill", function(d){
          var value = d.properties[expressed];
          if(value >= 0) {return colorScale(d.properties[expressed]);}
            else {return "#ccc";}
        })
        .on("mouseover", function(event, d){highlight(d.properties);})
        .on("mouseout", function(event, d){dehighlight(d.properties);})
        .on("mousemove", moveLabel);

    //building description element for enumeration units
    var desc = mapCounties.append("desc").text('{"stroke": "#333", "stroke-width": "2px"}');
  };

  //function to create coordinated bar chart
  function setChart(csvData, colorScale, yScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("#chartdiv")
        .append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .attr("class", "chart");

    var chartTitle = d3.select("#titlediv")
        .attr("class", "chartTitle")

    //set bars for each county
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){return a[expressed]-b[expressed];})
        .attr("class", function(d){return "bars " + d.NAME;})
        .attr("width", mapWidth / csvData.length - 1)
        .on("mouseover", function(event, d){highlight(d);})
        .on("mouseout", function(event, d){dehighlight(d);})
        .on("mousemove", moveLabel);

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){return a[expressed]-b[expressed]})
        .attr("class", function(d){return "numbers " + d.NAME;})
        .attr("text-anchor", "middle");  

        //mouse events not applied to these numbers
        
    updateChart(chartTitle, bars, numbers, csvData.length, colorScale, yScale);

    //building description element for bars, coincidentally the same as enumeration units
    var desc = bars.append("desc").text('{"stroke": "#333", "stroke-width": "2px"}');

    //building description element for numbers because numbers are on bars
    var desc = numbers.append("desc").text('{"stroke": "none", "stroke-width": "none"}');
  };

  //function to create a dropdown menu for attribute selection
  function createDropdown(csvData) {
    //add select element
    var dropdown = d3.select("#menudiv")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){changeAttribute(this.value, csvData)});

    //add initial option
    var titleOption = dropdown
        .append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown
        .selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function (d) {return d;})
        .text(function (d) {return d;});

  };

  //dropdown change event handler
  function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;

    //recreate the color and y scales
    var colorScale = makeColorScale(csvData);
    var yScale = makeYScale(csvData);

    //recolor enumeration units using class from setEnumerationUnits()
    var mapCounties = d3.selectAll(".AZ")
        .transition()
        .duration(800)
        .style("fill", function (d) {
        var value = d.properties[expressed];
        if (value >= 0) {return colorScale(d.properties[expressed]);} 
          else {return "#ccc";}
        });

    var chartTitle = d3.select(".chartTitle");

    //sort, resize, and recolor bars
    var bars = d3.selectAll(".bars")
        .sort(function(a,b){return a[expressed]-b[expressed]})
        .attr("width", mapWidth / csvData.length - 1)
        .transition()
        .delay(function (d,i){return i*20})
        .duration(500);

    //set up numbers
    var numbers = d3.selectAll(".numbers")
        .sort(function(a,b){return a[expressed]-b[expressed]})
        .transition()
        .delay(function (d,i){return i*25})
        .duration(500);

    updateChart(chartTitle, bars, numbers, csvData.length, colorScale, yScale);

    //description code not added when a new attribute is selected, but maybe it should be?
  };

  function updateChart(chartTitle, bars, numbers, length, colorScale, yScale) {
    
    //update Title for chart
    chartTitle.text(function(d){
        var aftertitle = " in Each County"
        if (expressed == "Population") {aftertitle = aftertitle + " (Log Scale)"}
        else if (expressed == "Average Household Income") {aftertitle = " ($)" + aftertitle}
        else {};
        return (expressed + aftertitle);
    }); //expressed is a string

    //position bars
    bars.attr("x", function (d, i) {return i * mapWidth / length;})
        .attr("height", function (d, i) {
          return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i) {
          return mapHeight - yScale(parseFloat(d[expressed]))
        })
        .style("fill", function(d) {
          var value = d[expressed];
          if (value >= 0) {return colorScale(value);}
            else {return "#ccc";}
        });

    //update numbers
    numbers.attr("x", function (d, i) {
          var fraction = mapWidth / length;
          var numX = i * fraction + (fraction - 1)/2;
          return numX;
        })
        .attr("text-anchor", function(d){
          var textAnchor = "";
          if (d[expressed] < 100) {textAnchor = "middle";}
            else {textAnchor = "top"};
          return textAnchor;
        })
        .attr("y", function(d){
          var numY = 0;
          //compare bar height vs num font size
          if (yScale(parseFloat(d[expressed])) <= 20 ) 
            {numY = mapHeight - yScale(parseFloat(d[expressed])) - 5 } //puts numbers above bar
          else {numY = mapHeight - yScale(parseFloat(d[expressed])) + 18;} //N can be adjusted
          return numY;
        })
        .attr("writing-mode", function(d){
          var writeMode = "";
          if (d[expressed] < 100) {writeMode = "horizontal-tb";}
            else {writeMode = "vertical-lr"};
            return writeMode;
        })
        .text(function(d){return parseInt(d[expressed])
        });

        
  };

  //function to highlight enumeration units and bars
  function highlight(props) {
    //change stroke
    var selected = d3
        .selectAll("." + props.NAME)
        .style("stroke", "red")
        .style("stroke-width", 2);
    setLabel(props);
  }

  //function to reset the element style on mouseout
  function dehighlight(props) {
    var selected = d3
        .selectAll("." + props.NAME)
        .style("stroke", function () {
            return getStyle(this, "stroke");
        })
        .style("stroke-width", function () {
            return getStyle(this, "stroke-width");
        });

    function getStyle(element, styleName) {
        var styleText = d3.select(element).select("desc").text();

        //errors with styleObject function, related to "desc" being null for numbers
        //it's weird that this function works with the attribute on load
        //but breaks when a user changes the attribute with the dropdown
        var styleObject = JSON.parse(styleText);
        console.log(styleObject[styleName]); //no styleName in styleObject --> goes to 1st item in desc

        return styleObject[styleName];
    }
    //remove info label
    d3.select(".infolabel").remove();
  }

  //function to create dynamic label
  function setLabel(props) {
    console.log("here!");
    //label content
    var labelAttribute = "<h3>" + props[expressed] + "</h3><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3
        .select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.NAME + "_label")
        .html(labelAttribute);

    var countyName = infolabel.append("div").attr("class", "labelname").html(props.name);
  }

  //function to move info label with mouse
  function moveLabel() {
    //get width of label
    var labelWidth = d3.select(".infolabel") //labelname?
        .node()
        .getBoundingClientRect()
        .width;

    /* code commented out to isolate errors
    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX -labelWidth - 10,
        y2 = event.clientY +25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");

    */

    d3.select(".infolabel")
      .style("left",4)
      .style("right",4);
  }





})();