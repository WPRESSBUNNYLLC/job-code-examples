//^*^(make sure to send back a message saying what the error is for connecting)

async function admin_auth(socket) {

  if(typeof(socket.request.session) !== 'object') { 
     return false;
  }

  if((typeof(socket.request.session.room_info) !== 'object') || (typeof(socket.request.session.room_info) == 'object' && typeof(socket.request.session.room_info.room_id) !== 'string')) { 
    return false;
  }

  if(socket.request.session.room_info.if_my_room == false && socket.request.session.room_info.room_priv.messages_priv == false) { 
    return false;
  }

  var room = await redisClient.get(socket.request.session.room_info.room_id);

  if(typeof(room) == 'undefined' || room == null || room == 'null') { 
    return false;
  }

  var room_object = JSON.parse(room); //unexpected end of json input error

  var possible_connected_clients = [];
  var admins_connected = 0;

  for(let i = 0; i < room_object.users.length; i++) { 

    if(room_object.users[i].user_type == 'client' && typeof(room_object.users[i].assigned_to) == 'object' && ((room_object.users[i].assigned_to.business_show_id == socket.request.session.user_info.business_show_id) || (room_object.users[i].assigned_to.socket_id == socket.id))) { 
      room_object.users[i].assigned_to = 'not assigned';
      possible_connected_clients.push(room_object.users[i].socket_id);
    }
    
    if((room_object.users[i].business_show_id == socket.request.session.user_info.business_show_id)) { // || typeof(io.sockets.server.eio.clients[room_object.users[i].socket_id]) == 'undefined'
      room_object.users.splice(i, 1);
      continue;
    }

    if(room_object.users[i].user_type == 'admin') { 
      admins_connected +=1;
    }

  }

  room_object.users.push({
    user_name: socket.request.session.user_info.name,
    user_email: socket.request.session.user_info.email,
    user_phone: socket.request.session.user_info.phone,
    user_location: socket.request.session.user_info.location,
    user_about: socket.request.session.user_info.about,
    user_active: true,
    user_src: socket.request.session.user_info.user_src,
    business_show_id: socket.request.session.user_info.business_show_id,
    user_messages_priv: socket.request.session.room_info.room_priv.messages_priv,
    user_products_priv: socket.request.session.room_info.room_priv.products_priv,
    user_orders_priv: socket.request.session.room_info.room_priv.orders_priv,
    user_blocked_priv: socket.request.session.room_info.room_priv.blocked_priv,
    user_appointments_priv: socket.request.session.room_info.room_priv.appointments_priv,
    user_social_priv: socket.request.session.room_info.room_priv.social_priv,
    user_tasks_priv: socket.request.session.room_info.room_priv.tasks_priv,
    user_clients_priv: socket.request.session.room_info.room_priv.clients_priv,
    peer_id: socket.request.session.room_info.peer_id,
    socket_id: socket.id,
    user_type: 'admin'  
  });

  admins_connected += 1;

  var room_string = JSON.stringify(room_object);
  await redisClient.set(socket.request.session.room_info.room_id, room_string);

  socket.request.session.initial_admin_connection = { 
    admin_count: admins_connected,
    users: room_object.users, 
    current_room_id: socket.request.session.room_info.room_id,
    admin_connecting_socket_id: socket.id,
    possible_connected_clients: possible_connected_clients
  }

  return true;

}

async function client_auth(socket) { //just fill this up with the correct information


  // if(typeof(socket.request.session) !== 'object') { 
  //   return false;
  // }

  // if((typeof(socket.request.session.room_info) !== 'object') || (typeof(socket.request.session.room_info) == 'object' && typeof(socket.request.session.room_info.room_id) !== 'string')) { 
  //   return false;
  // }

  if(socket.request.session.room_info.room_messages_on != true) { //
    //return false; will need to add this back into department link
  }

  // if(socket.request.session.blocked == true) { 
  //   return false;
  // }

  var room = await redisClient.get(socket.request.session.room_info.room_id);

  if(typeof(room) == 'undefined' || room == null || room == 'null') { 
    return false;
  }

  var room_object = JSON.parse(room);
  var admins_online = 0;

  for(let i = 0; i < room_object.users.length; i++) { 

    // if((room_object.users[i].business_show_id == socket.request.session.user_info.business_show_id)) { // io.sockets.server.eio.clients[room_object.users[i].socket_id] == undefined (this line should remove any user that is not connected anymore but it doesnt work so...)
    //   room_object.users.splice(i, 1);
    //   continue; this if is meant for leaks
    // }

    if(room_object.users[i].user_type == 'admin') { 
      admins_online += 1;
    }

  }

  var bid = uuidv4();

  room_object.users.push({
    user_name: 'CLI-' + parseInt(room_object.users.length),
    user_email: '...',
    user_phone: '...',
    user_location: '...',
    user_about: '...',
    user_active: true,
    user_src: 'none',
    business_show_id: bid,
    user_messages_priv: false,
    user_products_priv: false,
    user_orders_priv: false,
    user_blocked_priv: false,
    user_appointments_priv: false,
    user_social_priv: false,
    user_tasks_priv: false, 
    user_clients_priv: false,
    peer_id: socket.id,
    socket_id: socket.id,
    assigned_to: 'not assigned',
    user_type: 'client'
  });

  var room_string = JSON.stringify(room_object);
  await redisClient.set(socket.request.session.room_info.room_id, room_string);

  socket.request.session.initial_client_connection = { 
    admin_count: admins_online,
    users: room_object.users, 
    current_room_id: socket.request.session.room_info.room_id, //
    client_connecting_socket_id: socket.id
  }

  return true;

}

io.use(async (socket, next) => {

  if(typeof(socket.request.session.room_info) == 'object') {

    if(socket.request.session.room_info.entering_as == 'admin') {
      var admin = await admin_auth(socket);
      if(admin == true) { 
        next();
      }
    }

    if(socket.request.session.room_info.entering_as == 'client') {
      var client = await client_auth(socket);
      if(client == true) { 
        next();
      }
    }

  }
        
});

io.on("connection", (socket) => {

  // if(typeof(socket.request.session.delay) === 'number' && Date.now() < socket.request.session.delay) {
  //   return;
  // }

  // if(typeof(socket.request.session.request_count) !== 'object') { 
  //   socket.request.session.request_count = { start: Date.now(), count: 1 };
  // } else { 
  //   socket.request.session.request_count.count += 1; //^*^(this is not increasing... the above keeps hitting)
  // }  

  // var seconds = null;

  // if(socket.request.session.request_count.count > 7) { 
  //   seconds = (Date.now() - socket.request.session.request_count.start) / 1000;
  //   socket.request.session.request_count = undefined;
  // }

  // if(seconds !== null && seconds < 3) { 
  //   socket.request.session.delay = Date.now() + (1000 * 60 * 0.1);
  //   return;
  // }

  if(typeof(socket.request.session.initial_client_connection) == 'object') {
    handle_initial_client();
  } else if(typeof(socket.request.session.initial_admin_connection) == 'object') {
    handle_initial_admin();
  }
  
  socket.on(socket.request.session.room_info.room_id, async (decision_request) => { 

    switch(decision_request.message_type) {

      case 'admin_takes_a_client': //messages priv set on this

        if(socket.request.session.room_info.entering_as !== 'admin') { 
          return;
        }

        if(typeof(decision_request) !== 'object') { 
          return;
        }

        if(typeof(decision_request.client_socket_id) !== 'string') { 
          return;
        }

        var room = await redisClient.get(socket.request.session.room_info.room_id);

        if(typeof(room) !== 'string' || room == 'null' || room == null) { 
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'could_not_find_room'
          }); 
          return;
        }

        room = JSON.parse(room);

        for(let i = 0; i < room.users.length; i++) { 
          
          if(room.users[i].user_type == 'client' && room.users[i].socket_id == decision_request.client_socket_id) {

            if(typeof(room.users[i].assigned_to) == 'object') { 
              io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
                users: room.users,
                message_type: 'client_already_assigned_to_an_admin'
              }); 
            }

            if(typeof(room.users[i].assigned_to) == 'string') { 

              room.users[i].assigned_to = { 
                business_show_id: socket.request.session.user_info.business_show_id,
                name: socket.request.session.user_info.name,
                email: socket.request.session.user_info.email,
                phone: socket.request.session.user_info.phone,
                location: socket.request.session.user_info.location,
                about: socket.request.session.user_info.about,
                src: socket.request.session.user_info.user_src,
                socket_id: socket.id
              }

              io.to(decision_request.client_socket_id).emit(socket.request.session.room_info.room_id, { 
                admin_info: room.users[i].assigned_to,
                message_type: 'send_client_admins_info_when_admin_attached'
              }); 
  
              for(let i = 0; i < room.users.length; i++) {  
                if(room.users[i].user_type == 'admin') { 
                  io.to(room.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
                    users: room.users,
                    message_type: 'an_admin_has_assigned_themselves_to_a_client'
                  });
                }
              } 

              var room_string = JSON.stringify(room);
              await redisClient.set(socket.request.session.room_info.room_id, room_string);

            }

            return;

          }

        }
        
      break;

      case 'admin_releases_a_client': //messages priv is set on this

        if(socket.request.session.room_info.entering_as !== 'admin') { 
          return;
        }

        if(typeof(decision_request) !== 'object') { 
          return;
        }

        if(typeof(decision_request.client_socket_id) !== 'string') { 
          return;
        }

        var room = await redisClient.get(socket.request.session.room_info.room_id);

        if(typeof(room) !== 'string' || room == 'null' || room == null) { 
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'could_not_find_room'
          }); 
          return;
        }

        room = JSON.parse(room);

        for(let i = 0; i < room.users.length; i++) { 
          
          if(room.users[i].user_type == 'client' && room.users[i].socket_id == decision_request.client_socket_id) {

            if(typeof(room.users[i].assigned_to) == 'object' && ((room.users[i].assigned_to.business_show_id == socket.request.session.user_info.business_show_id) || (room.users[i].assigned_to.socket_id == socket.id))) { 

              room.users[i].assigned_to = 'not assigned';

              io.to(decision_request.client_socket_id).emit(socket.request.session.room_info.room_id, { 
                message_type: 'tell_client_they_have_been_released'
              });

              for(let i = 0; i < room.users.length; i++) {  
                if(room.users[i].user_type == 'admin') { 
                  io.to(room.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
                    users: room.users,
                    message_type: 'an_admin_has_relased_a_client'
                  });
                }
              } 

              var room_string = JSON.stringify(room);
              await redisClient.set(socket.request.session.room_info.room_id, room_string);

            }

            if(typeof(room.users[i].assigned_to) == 'string') { 
              io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
                users: room.users,
                message_type: 'the_client_you_are_trying_to_release_is_already_released'
              }); 
            }

            return;

          }

        }

      break;

      case 'admin_disconnects_a_client':

        if(socket.request.session.room_info.entering_as !== 'admin') { 
          return;
        }

        // if(socket.request.session.room_info.room_priv.blocked_priv == false) { //blocked priv for client 
        //   return;
        // } 

        if(typeof(decision_request) !== 'object') { 
          return;
        }

        if(typeof(decision_request.client_socket_id) !== 'string') { 
          return;
        }

        var room = await redisClient.get(socket.request.session.room_info.room_id);

        if(typeof(room) !== 'string' || room == 'null' || room == null) { 
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'could_not_find_room'
          }); 
          return;
        }

        room = JSON.parse(room);

        for(let i = 0; i < room.users.length; i++) { 

          if(room.users[i].user_type == 'client' && room.users[i].socket_id == decision_request.client_socket_id) {

            if(typeof(room.users[i].assigned_to) == 'string' || (typeof(room.users[i].assigned_to) == 'object' && ((room.users[i].assigned_to.business_show_id == socket.request.session.user_info.business_show_id) || (room.users[i].assigned_to.socket_id == socket.id)))) {

              //var put_this_person_in_blocked = room.users[i];

              room.users.splice(i, 1);

              io.to(decision_request.client_socket_id).emit(socket.request.session.room_info.room_id, { 
                message_type: 'let_client_know_their_messaging_session_is_over',
                warning: decision_request.warning
              }); 

              for(let i = 0; i < room.users.length; i++) { 
                if(room.users[i].user_type == 'admin') { 
                  io.to(room.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
                    users: room.users,
                    message_type: 'an_admin_has_disconnected_a_client'
                  }); 
                }
              }

              var room_string = JSON.stringify(room);
              await redisClient.set(socket.request.session.room_info.room_id, room_string);

              // if(typeof(decision_request.warning) === 'boolean' && decision_request.warning === false) {
              //   insert_into_blocked(put_this_person_in_blocked); //make sure to delete all from blocked when deleting room.. make sure to add a blocked list ina modal off of the main edit modal of the department....
              // }

            } 

            return;

          }

        }

      break;

      case 'admin_sends_message': //when you are an admin and you disconnect someone or release, AND THE admin logs back in coming from the client IN YOUR DEPARTMENT and sends you a message, it will show because the socket_id... which is fine

        if(socket.request.session.room_info.entering_as !== 'admin') { 
          return;
        }

        if(typeof(decision_request) !== 'object') { 
          return;
        }

        let count = {};

        if((typeof((decision_request.message_id)) !== 'number') || ((typeof(decision_request.message_id)) == 'number' && decision_request.message_id.toString().split('').length < Date.now().toString().split('').length)) { 
          count.message_id = 'message id not of the correct length';
        }

        if(typeof(decision_request.receiver_info_business_show_id) !== 'string') { 
          count.receiver_info_business_show_id = 'receivers id is not formatted correctly';
        } 

        if(typeof(decision_request.receiver_info_name) !== 'string') { 
          count.receiver_info_name = 'receivers name not formatted correctly';
        } 

        if(typeof(decision_request.receiver_info_picture) !== 'string') { 
          count.receiver_info_picture = 'picture name not formatted corectly';
        }

        if(typeof(decision_request.client_socket_id) !== 'string') { 
          count.client_socket_id = 'client socket id not formatted correctly';
        }

        var message_files_passed = true;
        if(((typeof(decision_request.message_files) !== 'object') || (typeof(decision_request.message_files) == 'object' && Array.isArray(decision_request.message_files) == false) || decision_request.message_files.length > 10)) { 
          message_files_passed = false;
          count.message_files = 'message files not formatted correctly or exeeding 10 file limit';
        }

        if((typeof(decision_request.message_text) !== 'string') || (typeof(decision_request.message_text) == 'string' && decision_request.message_text.length < 1) && (message_files_passed == true && decision_request.message_files.length == 0)) { 
          count.message_text = 'message text not formatted correctly';
        }

        if(((typeof(decision_request.admin_to_admin_or_admin_to_client_or_group) !== 'string') || ((typeof(decision_request.admin_to_admin_or_admin_to_client_or_group) == 'string') && (decision_request.admin_to_admin_or_admin_to_client_or_group !== 'group' && decision_request.admin_to_admin_or_admin_to_client_or_group !== 'client' && decision_request.admin_to_admin_or_admin_to_client_or_group !== 'admin')))) { 
          count.admin_to_admin_or_admin_to_client_or_group = 'user type must be client admin or group';
        }

        if(typeof(decision_request.time) !== 'string') { 
          count.time = 'time not formatted correctly';
        }

        let mb = Buffer.byteLength(JSON.stringify(decision_request.message_files), "utf-8") / 1000000;

        if(mb > 5) { 
           count.limit_size = 'must be 5mb or less';
        }

        for(let i = 0; i < decision_request.message_files.length; i++) {

          let extension =  decision_request.message_files[i].file.split('/')[1].split(';')[0];

          if(
             extension !== 'png' &&
             extension !== 'jpeg' && 
             extension !== 'octet-stream' &&
             extension !== 'pdf' && 
             extension !== 'plain' &&
             extension !== 'pptx' && 
             extension !== 'csv' && 
             extension !== 'img'
          ) { 
             count.files_input_error = 'the format of the files you are attempting to insert are not correct. files supported are png, jpg, docx, pdf, txt, csv, pptx, img';
             break;
          }

          if(typeof(decision_request.message_files[i].file_name) !== 'string') { 
             count.files_input_error = 'a file name is not of type string. please check the names of the files you are inserting';
             break;
          }

       }

        if(Object.keys(count).length > 0) { 
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'the_message_did_not_pass_all_tests_remove_from_array_and_elem',
          });           
          return;
        }

        var message_file_id = 'no files';

        if(decision_request.message_files.length > 0) {
          message_file_id = 'files/user-message-' + uuidv4() + '-' + socket.request.session.user_info.business_show_id + '.txt';
        }

        let admin_message = { 
          message_id: decision_request.message_id,
          message_type: 'admin_sends_message',
          sender_info_business_show_id: socket.request.session.user_info.business_show_id, 
          sender_info_name: socket.request.session.user_info.name,
          sender_info_picture: socket.request.session.user_info.user_src, 
          receiver_info_business_show_id: decision_request.receiver_info_business_show_id,
          receiver_info_name: decision_request.receiver_info_name,
          receiver_info_picture: decision_request.receiver_info_picture,
          client_socket_id: decision_request.client_socket_id,
          message_text: decision_request.message_text,
          message_files: message_file_id,
          admin_to_admin_or_admin_to_client_or_group: decision_request.admin_to_admin_or_admin_to_client_or_group,
          time: decision_request.time
        };

        if(decision_request.client_socket_id == socket.id) { //sending message to self
          insert_into_file_and_mysql(message_file_id);
          return;
        }

        if(decision_request.client_socket_id == 'socket_id_is_not_set_redirect_message_to_http') { 
          if(admin_message.admin_to_admin_or_admin_to_client_or_group !== 'client') { //voids insertin message sending to client
            insert_into_file_and_mysql(message_file_id);
          }
          return;
        }

        if(decision_request.client_socket_id == 'group_message') {

          var room = await redisClient.get(socket.request.session.room_info.room_id);

          if(typeof(room) !== 'string' || room == 'null' || room == null) { 
            io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
              message_type: 'could_not_find_room'
            }); 
            return;
          }

          room = JSON.parse(room);

          for(let i = 0; i < room.users.length; i++) { 
            if(room.users[i].socket_id !== socket.id && room.users[i].user_type == 'admin') {
              io.to(room.users[i].socket_id).emit(socket.request.session.room_info.room_id, admin_message)
            }
          }

          insert_into_file_and_mysql(message_file_id); //sending to all admins
          return;

        }

        io.to(decision_request.client_socket_id).emit(socket.request.session.room_info.room_id, admin_message); 

        if(admin_message.admin_to_admin_or_admin_to_client_or_group !== 'client') { //voids sending message to client
          insert_into_file_and_mysql(message_file_id);
        }

      break;

      case 'client_sends_message':

        if(socket.request.session.blocked === true) { //just a backup, add th other stuff above
          return false;
        }

        //send a message from the client to the admin... dont save the message ...just check and push the whatever and file

      break;

    }

    function insert_into_file_and_mysql(message_file_id) { 

      var sending_as = socket.request.session.room_info.entering_as;

      if(decision_request.message_files.length > 0) {
        try {
          fs.writeFileSync(message_file_id, JSON.stringify(decision_request.message_files));
        } catch (err) {
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'admin_could_not_insert_message_in_file_storage',
          });            
          return; 
        }
      }

      pool.query('INSERT INTO messages (room_owner_id, room_id, message_id, sender_info_business_show_id, sender_info_name, sender_info_picture, sending_as, receiver_info_business_show_id, receiver_info_name, receiver_info_picture, message_text, message_files, admin_to_admin_or_admin_to_client_or_group, time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [socket.request.session.room_info.room_owner_info.room_owner_business_show_id, socket.request.session.room_info.room_id, decision_request.message_id, socket.request.session.user_info.business_show_id, socket.request.session.user_info.name, socket.request.session.user_info.user_src, sending_as, decision_request.receiver_info_business_show_id, decision_request.receiver_info_name, decision_request.receiver_info_picture, decision_request.message_text, message_file_id, decision_request.admin_to_admin_or_admin_to_client_or_group, decision_request.time], (err, result) => {
        if(err) {
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'admin_could_not_insert_message_in_database',
          }); 
        }
      });

    }

    function insert_into_blocked(blocked) { //select count before insertion...or just do a uniqe on roomid and blockedid //also add the admin check in here too
      pool.query('INSERT INTO blocked (room_id, business_show_id, blocked_business_show_id, blocked_name, blocked_email, blocked_src, blocker_business_show_id, blocker_name, blocker_email, blocker_src) VALUES (?,?,?,?,?,?,?,?,?,?)', [socket.request.session.room_info.room_id, socket.request.session.room_info.room_owner_info.room_owner_business_show_id, blocked.business_show_id, blocked.user_name, blocked.user_email, blocked.user_src, socket.request.session.user_info.business_show_id, socket.request.session.user_info.name, socket.request.session.user_info.email, socket.request.session.user_info.user_src], (err, result) => {
        if(err) {
          io.to(socket.id).emit(socket.request.session.room_info.room_id, { 
            message_type: 'admin_could_not_block_this_user',
          }); 
        }
      });
    }

  });

  socket.on("disconnect", async (reason) => {

    var room_object = await redisClient.get(socket.request.session.room_info.room_id);

    if(typeof(room_object) == 'undefined' || room_object == null || room_object == 'null') { 
      return;
    }

    room_object = JSON.parse(room_object);
    var admins_online = 0;

    for(let i = 0; i < room_object.users.length; i++) { 

      // if(room_object.users[i].user_type == 'client' && typeof(room_object.users[i].assigned_to) == 'object' && ((room_object.users[i].assigned_to.business_show_id == socket.request.session.user_info.business_show_id) || (room_object.users[i].assigned_to.socket_id == socket.id))) { 
      //   room_object.users[i].assigned_to = 'not assigned';
      //   io.to(room_object.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
      //     message_type: 'send_client_that_their_admin_disconnected'
      //   }); 
      // }

      if(room_object.users[i].user_type == 'client' && typeof(room_object.users[i].assigned_to) == 'object' && (room_object.users[i].assigned_to.socket_id == socket.id)) { 
        room_object.users[i].assigned_to = 'not assigned';
        io.to(room_object.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
          message_type: 'send_client_that_their_admin_disconnected'
        }); 
      }

      // if(room_object.users[i].socket_id == socket.id || room_object.users[i].business_show_id == socket.request.session.user_info.business_show_id) { // io.sockets.server.eio.clients[room_object.users[i].socket_id] == undefined
      //   room_object.users.splice(i, 1);
      //   continue;
      // }

      if(room_object.users[i].socket_id == socket.id) { // io.sockets.server.eio.clients[room_object.users[i].socket_id] == undefined
        room_object.users.splice(i, 1);
        continue;
      }

      if(room_object.users[i].user_type == 'admin') {
        admins_online += 1;
      }

    }

    for(let i = 0; i < room_object.users.length; i++) { 

      if(room_object.users[i].user_type == 'admin') {
        io.to(room_object.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
          users: room_object.users,
          message_type: 'user_deleted'
        });  
      }

      if(room_object.users[i].user_type == 'client') {
        io.to(room_object.users[i].socket_id).emit(socket.request.session.room_info.room_id, { 
          count: admins_online,
          message_type: 'admins_online'
        }); 
      }

    }

    var room_string = JSON.stringify(room_object);
    await redisClient.set(socket.request.session.room_info.room_id, room_string);

  });

  function handle_initial_client() { 

    console.log('HELLO WORLD ------------------------------------------');
    console.log('HELLO WORLD ------------------------------------------');
    console.log('HELLO WORLD ------------------------------------------');
    console.log('HELLO WORLD ------------------------------------------');
    console.log('HELLO WORLD ------------------------------------------');
    console.log('HELLO WORLD ------------------------------------------');

    if(typeof(socket.request.session.initial_client_connection) == 'object') { 

      for(let i = 0; i < socket.request.session.initial_client_connection.users.length; i++) { 

        if(socket.request.session.initial_client_connection.users[i].user_type == 'admin') {

          io.to(socket.request.session.initial_client_connection.users[i].socket_id).emit(
            socket.request.session.initial_client_connection.current_room_id, {
            users: socket.request.session.initial_client_connection.users, 
            message_type: 'client_added'
          });

        }

      }

      io.to(socket.request.session.initial_client_connection.client_connecting_socket_id).emit(
        socket.request.session.initial_client_connection.current_room_id, {
        count: socket.request.session.initial_client_connection.admin_count, 
        message_type: 'admins_online' 
      });

      socket.request.session.initial_client_connection = undefined;

    }

  }

  function handle_initial_admin() { 

    if(typeof(socket.request.session.initial_admin_connection) == 'object') { 

      for(let i = 0; i < socket.request.session.initial_admin_connection.users.length; i++) { 

        if(socket.request.session.initial_admin_connection.users[i].user_type == 'admin') {
          io.to(socket.request.session.initial_admin_connection.users[i].socket_id).emit(
            socket.request.session.initial_admin_connection.current_room_id, { 
            users: socket.request.session.initial_admin_connection.users, 
            message_type: 'admin_added'
          });  
        }

        if(socket.request.session.initial_admin_connection.users[i].user_type == 'client') {
          io.to(socket.request.session.initial_admin_connection.users[i].socket_id).emit(
            socket.request.session.initial_admin_connection.current_room_id, { 
            count: socket.request.session.initial_admin_connection.admin_count, 
            message_type: 'admins_online'
          });  
        }

      }

      for(let i = 0; i < socket.request.session.initial_admin_connection.possible_connected_clients.length; i++) { 
        io.to(socket.request.session.initial_admin_connection.possible_connected_clients[i]).emit(
          socket.request.session.room_info.room_id, { 
          message_type: 'send_client_that_their_admin_disconnected'
        });
      }

      socket.request.session.initial_admin_connection = undefined;

    }
    
  }

 }); 
