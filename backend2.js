var express = require('express');
var router = express.Router();
var pool = require('../db/mysql');

router.get('/client-link', async function(req, res, next) {

  try {

    if(typeof(req.query.room_id) !== 'string') { 
      res.redirect('/?server=room not found');
      return;
    }

    var room_info_ = await room_info(req.query.room_id);

    if(room_info_.error === true) { 
      res.redirect(room_info_.error_message);
      return;
    }

    var products = [];

    if(room_info_.value.room_products_on == true) {

      products = await load_products(req.query.room_id);

      if(products.error == true) { 
        res.redirect(products.error_message);
        return;
      }

      products = products.value;

      req.session.client_products_ = [];

      for(let i = 0; i < products.length; i++) { 
        req.session.client_products_.push(products[i].id);
      }

    }

    req.session.client_room_id = req.query.room_id;
    req.session.client_room_contact_on = room_info_.value.room_contact_on;
    req.session.client_room_products_on = room_info_.value.room_products_on;

    res.render('client-link', { 
      req: req,
      room_info: room_info_.value,
      products: products, 
      contacts: room_info_.members,
      products_on: room_info_.value.room_products_on, 
      contact_on: room_info_.value.room_contact_on,
      found: true
    });

  } catch(err) { 
    var msg = typeof(err.error_message) !== 'undefined' ? err.error_message : err.message;
    res.redirect(msg);
    return;
  }

});

function room_info(room_id) { 

  return new Promise((resolve, reject) => { 

    var user_social_priv = true;
    var user_joined = true;

    pool.query('SELECT * FROM rooms WHERE room_id = ? AND user_social_priv = ? AND user_joined = ?', [room_id, user_social_priv, user_joined], (err, result) => { 

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      if(result.length < 1) { 
        return reject({error: true, error_message: `/?server=department not found`, value: 'not found'});
      }

      const room_info = { 
        room_id: result[0].room_id,
        room_name: result[0].room_name,
        room_owner_info: { 
          room_owner_business_show_id: result[0].room_owner_business_show_id,
          name: result[0].user_name,
          email: result[0].user_email,
          phone: result[0].user_phone,
          location: result[0].user_location,
          about: result[0].user_about,
          user_src: result[0].user_src,
          business_name: result[0].user_business
        },
        room_description: result[0].room_description,
        room_category: result[0].room_category,
        room_contact_on: result[0].room_contact_on,
        room_products_on: result[0].room_products_on,
        room_messages_on: result[0].room_messages_on,
        room_location: result[0].room_location,
        room_email: result[0].room_email,
        room_phone: result[0].room_phone,
        room_geo_latitude: result[0].room_geo_latitude,
        room_geo_longitude: result[0].room_geo_longitude,
      };

      return resolve({error: false, error_message: '', value: room_info, members: result});
      
    });

  });

}

function load_products(room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM products WHERE room_id = ? AND hidden = false ORDER BY category ASC LIMIT 5', [room_id], (err, result) => {

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      const products = result;

      return resolve({error: false, error_message: '', value: products});

    });

  });

}

module.exports = router;
