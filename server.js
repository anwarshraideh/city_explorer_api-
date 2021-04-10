'use strict';

require('dotenv').config(); // npm i dotenv

const express = require('express'); // npm i express
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const server = express();
server.use(cors());

const PORT = process.env.PORT || 5000;

//const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });




server.get('/', homeRouteHandler);
server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/parks', parksHandler);
server.get('/movies', MoviesHandler);
server.get('/yelp', yelpHandler);
server.get('*', notFoundHandler);

function homeRouteHandler(req,res){
  res.status(200).send('you server is working');
}


// request url (browser): localhost:3000/location

function locationHandler(req,res){

  let cityName = req.query.city;
  let sql = `SELECT FROM locations WHERE search_query=$1;`;
  let safeValue = [cityName];

  client.query(sql , safeValue)
    .then(result =>{
      console.log('dddd', result.rows);
      if (result.rows.length)
      {
        console.log('data exist in database');
        res.send(result.rows[0]);
      }
      else
      {
        console.log(cityName);
        console.log('data  not exist in database');

        let key = process.env.LOCATION_KEY;
        let LocationURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

        superagent.get(LocationURL)
          .then(geoData => {
            console.log('inside superagent');
            // console.log(geoData.body);
            let gData = geoData.body;
            const locationData = new Location(cityName, gData);
            // res.send(locationData);
            let sql2 = `INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING * ;`;
            let safeValue2 =[locationData.search_query,locationData.formatted_query,locationData.latitude,locationData.longitude];
            client.query(sql2 , safeValue2)
              .then(result =>{
                console.log('data inserted ');
                res.send(result.rows[0]);

              });

          })

          .catch(error => {
            console.log('inside superagent');
            console.log('Error in getting data from LocationIQ server');
            console.error(error);
            res.send(error);
          });
      }

    });


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


function MoviesHandler(req , res) {

  let city = req.query.search_query;
  let movkey = process.env.MOVIE_API_KEY;
  let movUrl = `https://api.themoviedb.org/3/search/movie?api_key=${movkey}&query=${city}`;

  superagent.get(movUrl)
    .then(movData => {
      let DataResultsArr = movData.body.results;
      let movieArray = DataResultsArr.map(item => new Movie(item));
      res.send(movieArray);
    })
    .catch((error) => {
      console.log('error in getting data ' + error);
    });

}

function yelpHandler (req , res) {

  let key = process.env.YELP_API_KEY;
  let page = req.query.page;

  let limit = 5;
  let start = ((page - 1) * 5 + 1);
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let ylepUrl = `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lon}&limit=${limit}&offset=${start}`;

  superagent.get(ylepUrl)
    .set('Authorization', `Bearer ${key}`)
    .then(yData => {

      let yelpData = yData.body.businesses;
      let yelpArray = yelpData.map(item => new Yelp(item));
      res.send(yelpArray);

    })

    .catch(( error) => {
      console.log('Error in getting data '+ error);
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


function Movie(moviesData) {

  this.title = moviesData.title;
  this.overview = moviesData.overview;
  this.average_votes = moviesData.average_votes;
  this.total_votes = moviesData.total_votes;
  this.image_url = `https://image.tmdb.org/t/p/w500${moviesData.poster_path}`;
  this.popularity = moviesData.popularity;
  this.released_on = moviesData.released_on;
}


function Yelp(yelpData) {
  this.name = yelpData.name;
  this.image_url = yelpData.image_url;
  this.price = yelpData.price;
  this.rating = yelpData.rating;
  this.url = yelpData.url;
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
