var express = require('express');
var router = express.Router();
const pool = require('../db/mysql');
const NodeGeocoder = require('node-geocoder');
var tokens = require('../db/access_tokens');

router.post('/hjhujk', function(req, res) { 

  if(
    typeof(req.session.selection_hidden_id) !== 'string' || 
    typeof(req.session.user_info) !== 'object'
  ) { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  } 

  if(typeof(tokens[req.session.selection_hidden_id]) !== 'number') { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  }

  if(Date.now() > tokens[req.session.selection_hidden_id]) {
    req.session.destroy();
    delete tokens[req.session.selection_hidden_id];
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return; 
  }

  var query = 'SELECT * FROM rooms WHERE (1 = 1 AND business_show_id = room_owner_business_show_id)';
  var arr = [];

  if(typeof(req.body.category) == 'string' && req.body.category.trim() !== '') { 
    query += ' AND (room_category LIKE ? OR room_name LIKE ?)'; 
    arr.push("%" + req.body.category + "%", "%" + req.body.category + "%");  
  } 

  if(typeof(req.body.reset_index) == 'boolean' && req.body.reset_index == true) { 
    req.session.last_id_main_departments = 0;
  }

  query += ' AND (id > ?)';
  arr.push(req.session.last_id_main_departments);
  
  if(
    typeof(req.body.longitude) == 'number' &&
    typeof(req.body.latitude) == 'number' && 
    typeof(req.body.if_location) == 'boolean' && req.body.if_location == true
  ) { 
    var left_long = req.body.longitude - 0.3;
    var right_long = req.body.longitude + 0.3;
    var lower_lat = req.body.latitude - 0.3;
    var upper_lat = req.body.latitude + 0.3;
    query += ' AND ((room_geo_longitude > ? AND room_geo_longitude < ?) AND (room_geo_latitude > ? AND room_geo_latitude < ?))';
    arr.push(left_long, right_long, lower_lat, upper_lat);
  }

  query += ' AND ((room_messages_on = true AND room_products_on = false) OR (room_messages_on = false AND room_products_on = true) OR (room_messages_on = true AND room_products_on = true)) LIMIT 10';

  pool.query(query, arr, (err, result) => { 

    if(err) {
      res.json(err);
      return;
    }

    if(result.length !== 0) { 
      req.session.last_id_main_departments = result[result.length - 1].id;
    }

    res.json({ 
      departments: result, 
      query: query,
      arr: arr
    });

  });

});

router.post('/admin_chat_initial_location_onload', async function(req, res) {

  return;

  if(
    typeof(req.session.selection_hidden_id) !== 'string' || 
    typeof(req.session.user_info) !== 'object'
  ) { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  } 

  if(typeof(tokens[req.session.selection_hidden_id]) !== 'number') { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  }

  if(Date.now() > tokens[req.session.selection_hidden_id]) {
    req.session.destroy();
    delete tokens[req.session.selection_hidden_id];
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return; 
  }

  var count = 0;

  if(typeof(req.body.longitude) !== 'number') { 
    count++;
  }

  if(typeof(req.body.latitude) !== 'number') { 
    count++;
  }

  if(count > 0) { 

    res.json({ 
      user_location: null, 
    });

    return;

  }

  const options = {
    provider: 'google',
    apiKey: 'mm,',
  };

  const geocoder = NodeGeocoder(options);
  const response = await geocoder.reverse({lat: req.body.latitude, lon: req.body.longitude });

  res.json({ 
    user_location: response, 
  });

})

router.post('/admin_chat_get_lat_long', async function(req, res) { 

  return;

  if(
    typeof(req.session.selection_hidden_id) !== 'string' || 
    typeof(req.session.user_info) !== 'object'
  ) { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  } 

  if(typeof(tokens[req.session.selection_hidden_id]) !== 'number') { 
    req.session.destroy();
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return;
  }

  if(Date.now() > tokens[req.session.selection_hidden_id]) {
    req.session.destroy();
    delete tokens[req.session.selection_hidden_id];
    res.json({response: { type: 'server_error', value: '/?server=session timed out' }});
    return; 
  }

  var geo_longitude;
  var geo_latitude;

  if(typeof(req.body.location == 'string') && req.body.location.trim().length > 3) {

    const options = {
      provider: 'google',
      apiKey: 'AIzaSyDjqMm_zeDjTOYy8h26LcuxBBfN7OjooBo',
    };

    const geocoder = NodeGeocoder(options);
    const response = await geocoder.geocode(req.body.location);

    if(response.length > 0) {
      geo_longitude = response[0].longitude;
      geo_latitude = response[0].latitude;
    } else { 
      geo_longitude = null;
      geo_latitude = null;
    }

    if(geo_longitude == null || geo_latitude == null) { 

      res.json({ 
        location: req.body.location,
        latitude: null, 
        longitude: null
      });

      return;

    }

    res.json({ 
      location: req.body.location,
      latitude: geo_latitude, 
      longitude: geo_longitude
    });

  } else { 

    res.json({ 
      location: req.body.location,
      latitude: null, 
      longitude: null
    });

    return;

  }

});

module.exports = router;
