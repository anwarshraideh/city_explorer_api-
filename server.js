'use strict';

require('dotenv').config(); // npm i dotenv

const express = require('express'); // npm i express
const cors = require('cors');
const superagent = require('superagent');


const PORT = process.env.PORT || 5000;
const server = express();
server.use(cors());


server.get('/', homeRouteHandler);
server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/parks', parksHandler);
server.get('*', notFoundHandler);


function homeRouteHandler(req,res){
  res.status(200).send('you server is working');
}

function notFoundHandler(req,res){

  let errObj = {
    status: 500,
    responseText: 'Sorry, something went wrong'
  };
  res.status(500).send(errObj);
}

// request url (browser): localhost:3000/location
function locationHandler(req,res){

  let cityName = req.query.city;
  let key = process.env.LOCATION_KEY;
  let LocationURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

  superagent.get(LocationURL)
    .then(geoData => {
      console.log('inside superagent');
      console.log(geoData.body);
      let gData = geoData.body;
      const locationData = new Location(cityName, gData);
      res.send(locationData);

    })

    .catch(error => {
      console.log('inside superagent');
      console.log('Error in getting data from LocationIQ server');
      console.error(error);
      res.send(error);
    });
}



function weatherHandler(req,res)
{


  console.log(req.query);

  let cityn = req.query.search_query;
  let key = process.env.WEATHER_KEY;
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let weatherURL = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${key}&city=${cityn}`;


  superagent.get(weatherURL)
    .then(weatherData => {
      let Data = weatherData.body.data;
      let ArrOfWeather = Data.map(value => {
        return new Weather (value);
      });
      res.send(ArrOfWeather);

    })


    .catch(error => {
      console.log('Error in getting data from LocationIQ server');
      console.error(error);
      res.send(error);
    });



}



function parksHandler(req, res) {
  console.log(req.query);

  let cityname2 = req.query.search_query;
  let key= process.env.PARK_API_KEY;
  let parksURL = `https://developer.nps.gov/api/v1/parks?q=${cityname2}&api_key=${key}&limit=10`;


  superagent.get(parksURL)
    .then(item => {
      let parkData = item.body.data.map(park => {
        return new Park(park);
      });
      res.send(parkData);

    })


    .catch(error => {
      console.log('Error in getting data from LocationIQ server');
      console.error(error);
      res.send(error);
    });



}



function Weather (data)
{
  this.forecast = data.weather.description;
  this.time = new Date(data.datetime).toDateString();

}

function Location(cityName, geoData) {
  this.search_query = cityName;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}

function Park(data){
  this.name = data.fullName;
  this.address =`${data.addresses[0].line1}, ${data.addresses[0].stateCode}, ${data.addresses[0].city}`;
  this.fee=data.entranceFees[0].cost;
  this.description=data.description;
  this.park_url=data.url;
}


server.listen(PORT,()=>{
  console.log(`Listening on PORT ${PORT}`);
});
