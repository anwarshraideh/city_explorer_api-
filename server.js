'use strict';

require('dotenv').config(); // npm i dotenv

const express = require('express'); // npm i express
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const server = express();
server.use(cors());

const PORT = process.env.PORT || 5000;
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });



server.get('/', homeRouteHandler);
server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/parks', parksHandler);
server.get('*', notFoundHandler);


// request url (browser): localhost:3000/location

function locationHandler(req,res){

  let cityName = req.query.city;
  let key = process.env.LOCATION_KEY;
  let LocationURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

  const sqLOC = `SELECT * FROM locations WHERE search_query = $1;`;
  let city = [cityName];


  client.query(sqLOC , city )
    .then(data => {

      console.log(data);
      if (data.rows.length === 0) {
        superagent.get(LocationURL)
          .then(geoData => {

            let gData = geoData.body;
            const locationData = new Location(cityName, gData);

            let locValueInsert = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES($1, $2, $3, $4) RETURNING *;';
            let safeValues = [cityName,locationData.formatted_query,locationData.latitude,locationData.longitude];

            client.query(locValueInsert , safeValues)
              .then ((data) =>
              {
                res.send(locationData);
              });
          })


          .catch(error => {
            console.log('inside superagent');
            console.log('Error in getting data from LocationIQ server');
            console.error(error);
            res.send(error);
          });



      }
      else if (data.rows[0].search_query === cityName)
      {

        const Obj = new Location(data.rows[0].search_query, data.rows[0]);
        res.send(Obj);
      }


    })
    .catch (error => 
      console.log( error)
    );


}



function weatherHandler(req,res)
{

  console.log(req.query);
  let cityn = req.query.search_query;
  let key = process.env.WEATHER_KEY;
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let weatherURL = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${key}&city=${cityn}&days=8`;
  superagent.get(weatherURL)
    .then(weatherData => {

      let ArrOfWeather = weatherData.body.data.map(value => {
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



function Weather (wdata)
{
  this.forecast = wdata.weather.description;
  this.time = new Date(wdata.datetime).toDateString();

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

client.connect()
  .then(() => {
    server.listen(PORT,()=>
      console.log(`Listening on PORT ${PORT}`)
    );
  });

