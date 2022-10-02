var express = require('express');
var router = express.Router();
var pool = require('../db/mysql');
var tokens = require('../db/access_tokens');

router.get('/ssjkajs-link', async function(req, res, next) {

  if(typeof(req.query.room_id) !== 'string') { 
    res.redirect('/?server=room not found');
    return;
  }

  if(typeof(req.session.room_id_redirect) == 'string') { 
    req.session.room_id_redirect = null;
  }

  if(typeof(req.session.user_info) !== 'object' || typeof(req.session.selection_hidden_id) !== 'string') { 
    req.session.signed_in = false;
  } else { 
    req.session.signed_in = true;
  }

  const am_i_blocked = await check_and_set_a_blocked_attribute(req.session.user_info.business_show_id, req.query.room_id)

  if(am_i_blocked.error == true || am_i_blocked.value == true) { 
    req.session.destroy();
    res.redirect(am_i_blocked.error_message);
    return;
  }

  const check_if_i_can_access_this_room = await room_access_and_info(req.query.room_id);
  
  if(check_if_i_can_access_this_room.error == true) { 
    req.session.destroy();
    res.redirect(check_if_i_can_access_this_room.error_message);
    return;
  }

  req.session.room_info = check_if_i_can_access_this_room.value;

  var products = [];

  if(req.session.room_info.room_products_on == true) {

    products = await load_products(req.query.room_id);

    if(products.error == true) { 
      req.session.destroy();
      res.redirect(products.error_message);
      return;
    }

    products = products.value;

    if(products.length !== 0) {
      req.session.last_id_products = products[products.length-1].id;
    } else { 
      req.session.last_id_products = 0;
    }

  }

  var messages = [];

  if(req.session.room_info.room_messages_on == true && req.session.signed_in == true) {

    messages = await load_messages(req.session.user_info.business_show_id, req.query.room_id);

    if(messages.error == true) { 
      req.session.destroy();
      res.redirect(messages.error_message);
      return;
    }

    messages = messages.value;

    if(messages.length !== 0) {
      req.session.last_id_messages = messages[messages.length-1].message_id;
    } else { 
      req.session.last_id_messages = '9999999999999999';
    }

  }

  var orders = [];

  if(req.session.signed_in == true) { 
    
    orders = await load_orders(req.session.user_info.business_show_id, req.query.room_id);

    if(orders.error == true) { 
      req.session.destroy();
      res.redirect(orders.error_message);
      return;
    }

    orders = orders.value;

    if(orders.length !== 0) {
      req.session.last_id_orders = orders[orders.length-1].id;
    } else { 
      req.session.last_id_orders = 0;
    }

  }

  res.render('client-link', { 
    req: req,
    products: products, 
    messages: messages,
    orders: orders, 
  });

});

function room_access_and_info(room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM rooms WHERE room_id = ? AND business_show_id = room_owner_business_show_id LIMIT 1', [room_id], (err, result) => { 

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      if(result.length !== 1) { 
        return reject({error: true, error_message: `/?server=department not found`, value: ''});
      }

      if(result[0].room_products_on == false && result[0].room_messages_on == false) { 
        return reject({error: true, error_message: `/?server=this department is not active`, value: ''});
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
        room_products_on: result[0].room_products_on,
        room_messages_on: result[0].room_messages_on,
        room_location: result[0].room_location,
        room_email: result[0].room_email,
        room_phone: result[0].room_phone,
        room_geo_latitude: result[0].room_geo_latitude,
        room_geo_longitude: result[0].room_geo_longitude,
        entering_as: 'client',
      };

      return resolve({error: false, error_message: '', value: room_info});
      
    });

  });

}

function check_and_set_a_blocked_attribute(business_show_id, room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM blocked WHERE room_id = ? AND blocked_business_show_id = ? LIMIT 1', [room_id, business_show_id], (err, result) => {

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      const blocked = result.length;

      return resolve({error: false, error_message: '/?server=you have been blocked from this department', value: blocked > 0 ? true : false });

    });

  });

}

function load_products(room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM products WHERE room_id = ? AND hidden = false ORDER BY id LIMIT 5', [room_id], (err, result) => {

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      const products = result;

      return resolve({error: false, error_message: '', value: products});

    });

  });

}

function load_messages(business_show_id, room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM messages WHERE ((sender_info_business_show_id = ? AND sending_as = "client") OR (receiver_info_business_show_id = ? AND admin_to_admin_or_admin_to_client_or_group = "client")) AND room_id = ? ORDER BY id DESC LIMIT 10', [business_show_id, business_show_id, room_id], (err, result) => {

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      const messages = result;

      return resolve({error: false, error_message: '', value: messages});

    });

  });

}

function load_orders(business_show_id, room_id) { 

  return new Promise((resolve, reject) => { 

    pool.query('SELECT * FROM orders WHERE business_show_id = ? AND room_id = ? ORDER BY id DESC LIMIT 10', [business_show_id, room_id], (err, result) => {

      if(err) {
        return reject({error: true, error_message: `/?server=error on server, we are doing what we can to fix this: ${err}`, value: ''});
      }

      const orders = result;

      return resolve({error: false, error_message: '', value: orders});

    });

  });

}

module.exports = router;
