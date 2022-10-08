var express = require('express');
var pool = require('../db/mysql');
const {v4 : uuidv4} = require('uuid')
var router = express.Router();
var tokens = require('../db/access_tokens');

router.get('/', (req, res, next) => {
  res.render('auth-login', { req: req });
});

router.post('/auth-login', function(req, res, next) {

    if(typeof(req.session.login_attempts) !== 'undefined' && req.session.recover_attempts > 20) { 
      res.redirect('/?email=you have attempted to login too many times. Please wait or reset your password');
      return;
    }

    var error = {};

    if(typeof(req.body.email) !== 'string' || req.body.email.length > 255 || !String(req.body.email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )) { 
      error.email = 'Email is invalid';
    };
 
    if(typeof(req.body.password) !== 'string' || req.body.password.length > 255 || !String(req.body.password)
    .match(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
    )) { 
      error.password = 'Password must have between 8 and 200 characters, have at least one uppercase letter, one lowercase letter, one number and a special character';
    }
  
    pool.query('SELECT selection_hidden_id FROM users WHERE email = ? AND password = ?', [req.body.email, req.body.password], (err, result) => {
 
    if(err) {
      res.redirect(`/?server=error on server, we are doing what we can to fix this`);
      return;
    }
 
    const user_count = result.length;
 
    if(user_count !== 1) { 

      if(typeof(error.email) === 'undefined') {
        error.email = 'Wrong email and password combination';
      } else { 
        error.email += ' and wrong email / password combination';
      }

      if(typeof(req.session.login_attempts) === 'undefined') {
        req.session.login_attempts = 1;
      } else {
        req.session.login_attempts += 1;
      }

    }
 
    if(Object.keys(error).length > 0) { 
      var error_string = '?';
      for (const [key, value] of Object.entries(error)) {
        error_string += `${key}=${value}&`;
      }
      error_string += `page=login&email_value=${req.body.email}&password_value=${req.body.password}`;
      res.redirect(`/${error_string}`);
      return;
    }

    // if(user_count === 1 && result[0].email_approved !== true) { 
    //   //send email to approve user
    // } 

    const selection_hidden_id_update = uuidv4();

    pool.query('UPDATE users SET selection_hidden_id = ? WHERE email = ? AND password = ? AND selection_hidden_id = ?', [selection_hidden_id_update, req.body.email, req.body.password, result[0].selection_hidden_id], (err, result) => {

      if(err) {
        res.redirect(`/?server=error on server, we are doing what we can to fix this`);
        return;
      }

      req.session.selection_hidden_id = selection_hidden_id_update;
      tokens[selection_hidden_id_update] = Date.now() + 86400000;
      res.redirect('/admin-chat?room_name=...&room_id=none');

    });

  });

});

router.get('/login_to_reset_password_from_link', function(req, res, next) { 

  if(typeof(req.session.reset_attempts) !== 'undefined' && req.session.reset_attempts > 20) { 
    res.redirect('/?server=you have attempted to visit this page too many times. Please wait');
    return;
  }
 
  pool.query('SELECT selection_hidden_id, email FROM users WHERE selection_hidden_id = ? AND email = ?', [req.query.id, req.query.email], (err, result) => {
 
    if(err) {
      res.redirect(`/?server=error on server, we are doing what we can to fix this`);
      return;
    }
 
    const user_count = result.length;
 
    if(user_count !== 1) { 

      if(typeof(req.session.reset_attempts) === 'undefined') {
        req.session.reset_attempts = 1;
      } else {
        req.session.reset_attempts += 1;
      }

      res.redirect(`/?server=The user does not exist`);
      return;

    }

    const selection_hidden_id_update_reset = uuidv4();

      pool.query('UPDATE users SET selection_hidden_id = ? WHERE selection_hidden_id = ? AND email = ?', [selection_hidden_id_update_reset, result[0].selection_hidden_id, result[0].email], (err, result) => {

        if(err) {
          res.redirect(`/?server=error on server, we are doing what we can to fix this`);
          return;
        }

        req.session.selection_hidden_id = selection_hidden_id_update_reset;
        tokens[selection_hidden_id_update_reset] = Date.now() + 86400000;
        res.redirect('/admin-chat?room_name=...&room_id=nonereset_pop_up_modal=true');

      });

  });

});

module.exports = router;
