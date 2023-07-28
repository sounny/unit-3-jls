// Script by Jessica Steslow using Lab 2 Module 2 exercises for Activity 9

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 1000,
        height = 800;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Azimuthal equal area conic projection centered on Arizona, USA
    var projection = d3.geoAzimuthalEqualArea()
        .center([0, 34.2])
        .rotate([112,0,0])
        .scale(5000)
        .translate([width/2, height/2]);

    //create the path generator
    var path = d3.geoPath()
        .projection(projection);

    //graticule likely not needed for my purpose, it's here in case I use it later
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every X degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path); //project graticule

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines


    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/EnvironmentalPerAZCounty.csv"),
                    d3.json("data/AZcounties.topojson"),
                    d3.json("data/Mexicostates.topojson"),
                    d3.json("data/USstates.topojson")];
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            counties = data[1],
            mexico = data[2],
            states = data[3];
        console.log(csvData);
        console.log(counties);  //helpful to log these to confirm object name
        console.log(mexico);    //object name used below in topojson.feature()
        console.log(states);

        //translate TopoJSON to GeoJSON
        //.features used for geojson for individual data and styling (the choropleth data)
        var azCounties = topojson.feature(counties, counties.objects.AZcounties).features;
            //slightly different formatting for base data
            mexicoBoundary = topojson.feature(mexico, mexico.objects.Mexicostates),
            statesBoundary = topojson.feature(states, states.objects.USstates);

            console.log(csvData);   //helpful to log these to confirm data type change
            console.log(counties);
            console.log(mexico);

        //add base data to map with append
        var mapMexico = map.append("path")
            .datum(mexicoBoundary)
            .attr("class", "mexico")
            .attr("d", path);

        var mapStates = map.append("path")
            .datum(statesBoundary)
            .attr("class", "states")
            .attr("d", path);

        //add data to apply choropleth later with selectAll
        //this is further down in code to draw on top of base features
        var mapCounties = map.selectAll(".mapCounties")
            .data(azCounties)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "AZ " + d.properties.NAME;
            })
            .attr("d", path);

    };


};