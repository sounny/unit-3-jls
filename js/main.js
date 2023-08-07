//Script by Jessica Steslow using Lab 2 Module 3 exercises for Activity 10

//wrap everything in an anonymous function which is immediately invoked
//also prevents items in this JS file being in global scope
(function(){

  //pseudo-global variables
  var attrArray = [   //list of attributes
    "Active_VRP",
    "AvHHIncome",
    "County",
    "DW_contaminants",
    "Democratic",
    "HW_LQG",
    "HW_remediation",
    "ImpairedWater",
    "Leaking_UST",
    "Other_party",
    "Population",
    "Republican",
    "Superfund"];

	var expressed = attrArray[7]; //initial attribute. I chose [7] for better numbers to work with

  //begin script when window loads
  window.onload = setBaseMap();

  //set up choropleth map
  function setBaseMap(){

      //map frame dimensions
      var width = 0;
      if(window.innerWidth <= 1600) {width = window.innerWidth*0.425} 
        else {width = 600};
      var height = width;

      //create new svg container for the map
      var basemap = d3.select("#mapdiv")
          .append("svg")
          .attr("class", "basemap")
          .attr("width", width)
          .attr("height", height);

      //create Azimuthal equal area conic projection centered on Arizona, USA
      var projection = d3.geoAzimuthalEqualArea()
          .center([0, 34.2])
          .rotate([112,0,0])
          .scale(width*10) //5500 preferred static scale, width*10 is a happy coincidence
          .translate([width/2, height/2]);

      //create the path generator
      var path = d3.geoPath()
          .projection(projection);

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

          setGraticule(basemap,path); //may use graticule for small scale locater map

          //translate TopoJSON to GeoJSON
          //.features used for geojson for individual data and styling (the choropleth data)
          var azCounties = topojson.feature(counties, counties.objects.AZcounties).features,
              //slightly different formatting for base data
              mexicoBoundary = topojson.feature(mexico, mexico.objects.Mexicostates),
              statesBoundary = topojson.feature(states, states.objects.USstates);

              /*console.log(csvData);   //helpful to log these to confirm data type change
              console.log(counties);
              console.log(mexico);*/

          //add base data to map with append
          var mapMexico = basemap.append("path")
              .datum(mexicoBoundary)
              .attr("class", "mexico")
              .attr("d", path);

          var mapStates = basemap.append("path")
              .datum(statesBoundary)
              .attr("class", "states")
              .attr("d", path);

          azCounties = joinData(azCounties, csvData)

          //create the color scale
          var colorScale = makeColorScale(csvData);

          setEnumerationUnits(azCounties, basemap, path, colorScale);

          //add coordinated visualization to the map
          setChart(csvData, colorScale);

      };
  };

  function setGraticule (basemap, path){
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
  };

  function joinData(azCounties, csvData){
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i < csvData.length; i++){
      var csvCounty = csvData[i]; //the current region
      var csvKey = csvCounty.County //the csv primary key

      //loop through geojson regions to find correct region
      for (var a=0; a < azCounties.length; a++){
        var geojsonProps = azCounties[a].properties; //the current region geojson properties
        var geojsonKey = geojsonProps.NAME //the geojson primary key

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

  //function to create color scale generator
  function makeColorScale(data){
    var colorClasses = [
        "#ffffb2",
        "#fed976",
        "#feb24c",
        "#fd8d3c",
        "#f03b20"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };
    console.log(domainArray);

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
  };

  function setEnumerationUnits(azCounties, basemap, path, colorScale){
    //add data to apply choropleth later with selectAll
    //this is further down in code to draw on top of base features
    var mapCounties = basemap.selectAll(".mapCounties")
        .data(azCounties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "AZ " + d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function(d){
          var value = d.properties[expressed];
          console.log(d.properties[expressed]);
          console.log(colorScale(d.properties[expressed]));
          console.log(value);
          if(value >=0 ) {
              return colorScale(d.properties[expressed]); 
          } else {                
              return "#ccc";            
          }
        });
  };

  //function to create coordinated bar chart
  function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = 0;
    if(window.innerWidth <= 1600) {chartWidth = window.innerWidth*0.425} 
      else {chartWidth = 600};
    var chartHeight = chartWidth;

    //create a second svg element to hold the bar chart
    var chart = d3.select("#chartdiv")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed + " in each County"); //expressed is a string

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 42]);  //dependent on dataset

    //set bars for each county
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.NAME;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
          return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.NAME;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            if ((parseFloat(d[expressed])) <= 2 ) {
              return chartHeight - yScale(parseFloat(d[expressed])) - 5 //To put text above small columns
            }
            else {
            return chartHeight - yScale(parseFloat(d[expressed])) + 18; //N can be adjusted
            }
        })
        .text(function(d){
            return d[expressed];
        });
  
  
  
  };

})();