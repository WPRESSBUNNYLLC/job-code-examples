let message_files = [];
let g_peer = null;
const socket = io();

socket.on(state.room_info.room_id, async (data) => {

   if(data.message_type == 'admin_added') { 
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'user_deleted') { 
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'client_added') { 
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'an_admin_has_assigned_themselves_to_a_client') { 
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'client_already_assigned_to_an_admin') {
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'an_admin_has_relased_a_client') {
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'an_admin_has_disconnected_a_client') {
      state.socket_instances = data.users;
      instance_reload();
   }

   if(data.message_type == 'admin_sends_message') { 
      if(data.admin_to_admin_or_admin_to_client_or_group == 'group') { 
         typeof(state.messages[state.room_info.room_id + '_' + data.admin_to_admin_or_admin_to_client_or_group]) == 'undefined' ? state.messages[state.room_info.room_id + '_' + data.admin_to_admin_or_admin_to_client_or_group] = [] : '';
         state.messages[state.room_info.room_id + '_' + data.admin_to_admin_or_admin_to_client_or_group].push(data);
         state.focus_user.user_type_admin_or_client_or_group == 'group' ? $('#messages').append(await right_element(data.message_text, data.message_files, data.sender_info_name, data.sender_info_picture, data.time, data.message_id)) : '';
      } else if(data.admin_to_admin_or_admin_to_client_or_group == 'client') { 
         typeof(state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group]) == 'undefined' ? state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group] = [] : '';
         state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group].push(data);
         state.focus_user.business_show_id == data.sender_info_business_show_id  ? $('#messages').append(await right_element(data.message_text, data.message_files, data.sender_info_name, data.sender_info_picture, data.time, data.message_id)) : '';
      } else if(data.admin_to_admin_or_admin_to_client_or_group == 'admin') { 
         typeof(state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group]) == 'undefined' ? state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group] = [] : '';
         state.messages[data.sender_info_business_show_id + '_' + data.admin_to_admin_or_admin_to_client_or_group].push(data);
         state.focus_user.business_show_id == data.sender_info_business_show_id  ? $('#messages').append(await right_element(data.message_text, data.message_files, data.sender_info_name, data.sender_info_picture, data.time, data.message_id)) : '';
      }
   }

   if(data.message_type == 'client_sends_message') { 
      //determine typ, puush and append
   }

});

function instance_reload() { 

   state.toggle_waiting = [];
   state.toggle_clients = [];
   state.live_admins = [];

   $('#socket_instances_for_calling').empty();
   $('#socket_instances_for_calling_client').empty();

   for(let i = 0 ; i < state.socket_instances.length; i++) { 

      if(
         state.socket_instances[i].user_type == 'client' && 
         typeof(state.socket_instances[i].assigned_to) == 'string' && 
         state.socket_instances[i].assigned_to == 'not assigned'
      ) { 
         state.toggle_waiting.push(state.socket_instances[i]);
      }

      if(
         state.socket_instances[i].user_type == 'client' && 
         typeof(state.socket_instances[i].assigned_to) == 'object' && 
         state.socket_instances[i].assigned_to.business_show_id == state.my_info.business_show_id
      ) { 
         state.toggle_clients.push(state.socket_instances[i]);
      }

      if(state.socket_instances[i].user_type == 'admin') {
         state.live_admins.push(state.socket_instances[i]); 
      }

      if(state.focus_user.business_show_id == state.socket_instances[i].business_show_id) { 
         state.focus_user.socket_id = state.socket_instances[i].socket_id;
      } 

      if(state.socket_instances[i].business_show_id == state.my_info.business_show_id && g_peer == null) { 
         g_peer = new Peer(state.socket_instances[i].socket_id); //huh, library im pretty sure says Peer... it works so just leave it...
         init_video(g_peer);
      }

      if(state.socket_instances[i].business_show_id !== state.my_info.business_show_id) {

         if(state.socket_instances[i].user_type == 'admin') {
            $('#socket_instances_for_calling').append(`
               <p style = 'padding: 2px;'>
                  <h6>${state.socket_instances[i].user_name} <br> ${state.socket_instances[i].user_phone ? state.socket_instances[i].user_phone : 'no number'} <br> ${state.socket_instances[i].user_email} <br> Admin </h6>
                  <h4 id = "call-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "make_call('${state.socket_instances[i].socket_id}')">call</h4>
                  <h4 id = "calling-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" hidden>calling...</h4>
                  <h4 id = "answer-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "answer_call('${state.socket_instances[i].socket_id}')" hidden>answer call...</h4>
                  <h4 id = "hangup-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "hangup('${state.socket_instances[i].socket_id}')" hidden>hang up</h4>
               </p>
            `);
         }

         if(
            state.socket_instances[i].user_type == 'client' && 
            typeof(state.socket_instances[i].assigned_to) == 'object' && 
            state.socket_instances[i].assigned_to.business_show_id == state.my_info.business_show_id
         ) { 
            $('#socket_instances_for_calling_client').append(`
               <p style = 'padding: 2px;'>
                  <h6>${state.socket_instances[i].user_name} <br> ${state.socket_instances[i].user_phone ? state.socket_instances[i].user_phone : 'no number'} <br> ${state.socket_instances[i].user_email} <br> Client </h6>
                  <h4 id = "call-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "make_call('${state.socket_instances[i].socket_id}')">call</h4>
                  <h4 id = "calling-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" hidden>calling...</h4>
                  <h4 id = "answer-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "answer_call('${state.socket_instances[i].socket_id}')" hidden>answer call...</h4>
                  <h4 id = "hangup-${state.socket_instances[i].socket_id}" style = "cursor: pointer" class = "hide_all_calling-${state.socket_instances[i].socket_id}" onclick = "hangup('${state.socket_instances[i].socket_id}')" hidden>hang up</h4>
               </p>
            `);
         }

      }

   }

   if(document.querySelector('#toggle_set_view_current_set').innerText.toLowerCase().trim() == 'joined admins') { 
      load_joined_admins_in_this_room();
   }

   else if(document.querySelector('#toggle_set_view_current_set').innerText.toLowerCase().trim() == 'waiting room clients') {
      load_waiting_room();
   }

   else if(document.querySelector('#toggle_set_view_current_set').innerText.toLowerCase().trim() == 'my live clients') {
      load_my_clients();
   }

   reinstantiate_the_correct_element_from_current_call();

}

function take_client(socket_id) {

   socket.emit(state.room_info.room_id,  {
      message_type: 'admin_takes_a_client',
      client_socket_id: socket_id
   });

   $('#user-profile-hide').click();

}

function release_client(socket_id) { 

   socket.emit(state.room_info.room_id,  {
      message_type: 'admin_releases_a_client',
      client_socket_id: socket_id
   });

   $('#user-profile-hide').click();

}

function disconnect_client(socket_id) {

   var warning = false;

   if ($('#warning_before_block').is(":checked")) {
     warning = true;
   }

   socket.emit(state.room_info.room_id,  {
      message_type: 'admin_disconnects_a_client',
      client_socket_id: socket_id,
      warning: warning
   });

   $('#user-profile-hide').click();

}

function load_initial_messages() {

   if(state.focus_user.user_type_admin_or_client_or_group.trim() == '...') { 
      return;
   }

   let pull_five = false;

   if(state.focus_user.business_show_id == state.my_info.business_show_id) { 

      if(typeof(state.messages[state.my_info.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group]) == 'undefined') { //s
         state.messages[state.my_info.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group] = [];
         pull_five = true;
      }

      retrieve_mysql(state.my_info.business_show_id, state.focus_user.user_type_admin_or_client_or_group, pull_five);
      return;

   }

   if(state.focus_user.socket_id == 'socket_id_is_not_set_redirect_message_to_http') {

      if(typeof(state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group]) == 'undefined') { //s
         state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group] = [];
         pull_five = true;
      }

      retrieve_mysql(state.focus_user.business_show_id, state.focus_user.user_type_admin_or_client_or_group, pull_five);
      return;

   }

   if(state.focus_user.socket_id == 'group_message') { 

      if(typeof(state.messages[state.room_info.room_id + '_' + state.focus_user.user_type_admin_or_client_or_group]) == 'undefined') { //d
         state.messages[state.room_info.room_id + '_' + state.focus_user.user_type_admin_or_client_or_group] = [];
         pull_five = true;
      }

      retrieve_mysql(state.room_info.room_id, state.focus_user.user_type_admin_or_client_or_group, pull_five);
      return;

   }

   if(typeof(state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group]) == 'undefined') { //s
      pull_five = true;
      state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group] = [];
      retrieve_mysql(state.focus_user.business_show_id, state.focus_user.user_type_admin_or_client_or_group, pull_five);
      return;
   }

   retrieve_mysql(state.focus_user.business_show_id, state.focus_user.user_type_admin_or_client_or_group, pull_five);

}

$('#load_more_messages').click(function() {

   let id_type;

   if(state.focus_user.user_type_admin_or_client_or_group == 'group') {
      id_type = state.room_info.room_id;
   } else { 
      id_type = state.focus_user.business_show_id;
   }

   retrieve_mysql(id_type, state.focus_user.user_type_admin_or_client_or_group, true);

});

async function retrieve_mysql(id, type_of_request, pull_five) {

   if(state.focus_user.user_type_admin_or_client_or_group.trim() == '...') { 
      return;
   }

   if(pull_five == true) { 
     let messages = await pull_five_descending(id, type_of_request);
     messages = messages.reverse(); 
     state.messages[id + '_' + type_of_request].unshift(...messages);
   }

   let duplicate_ids = {};
   let this_user = state.messages[id + '_' + type_of_request];
   $('#messages').empty();

   for(let i = 0; i < this_user.length; i++) { 

      if(duplicate_ids[this_user[i].message_id] == true) { 
         state.messages[id + '_' + type_of_request].splice(i, 1);
         continue;
      }

      if(this_user[i].sender_info_business_show_id == state.my_info.business_show_id) {
         $('#messages').append(await left_element(this_user[i].message_text, this_user[i].message_files, this_user[i].sender_info_name, this_user[i].sender_info_picture, this_user[i].time, this_user[i].message_id));
      } else { 
         $('#messages').append(await right_element(this_user[i].message_text, this_user[i].message_files, this_user[i].sender_info_name, this_user[i].sender_info_picture, this_user[i].time, this_user[i].message_id));
      }

      duplicate_ids[this_user[i].message_id] = true;

   }

   $('#message_input_field').focus();

}

async function pull_five_descending(receiver_id, message_type) { 

   try {

      return await axios.post('http://localhost:3000/admin_chat_select_messages', { 

         receiver_id: receiver_id,

         message_type: message_type,

      }).then(function (result) {

         result = result.data;

         if(result.response.type === 'server_error') { 
            window.location.href = result.response.value;
            return;
         }

         if(result.response.type == 'selected_messages') { 
            return result.response.value;
         }

         if(result.response.type === 'errors') { 
            return [];
         }

         window.location.href = '/?server=error on server, we are doing what we can to fix this - main';

      }).catch(function (err) {
         console.log(err);
      });

   } catch(err) { 
      alert(err);
   }
   
}

$('#message_send_button').click(async function() {

   if(state.focus_user.user_type_admin_or_client_or_group.trim() == '...') { 
      return;
   }

   let message = {
      message_id: Date.now(),
      message_type: 'admin_sends_message',
      sender_info_business_show_id: state.my_info.business_show_id, 
      sender_info_name: state.my_info.name,
      sender_info_picture: state.my_info.user_src, 
      receiver_info_business_show_id: state.focus_user.business_show_id,
      receiver_info_name: state.focus_user.name,
      receiver_info_picture: state.focus_user.src,
      client_socket_id: state.focus_user.socket_id,
      message_text: $('#message_input_field').val(),
      message_files: message_files,
      admin_to_admin_or_admin_to_client_or_group: state.focus_user.user_type_admin_or_client_or_group,
      time: new Date().toLocaleString()
   }

   let count = {};

   if((typeof((message.message_id)) !== 'number') || ((typeof(message.message_id)) == 'number' && message.message_id.toString().split('').length < Date.now().toString().split('').length))  { 
      count.message_id = 'message id not of the correct length';
   }

   if(typeof(message.receiver_info_business_show_id) !== 'string') { 
      count.receiver_info_business_show_id = 'receivers id is not formatted correctly';
   }

   if(typeof(message.receiver_info_name) !== 'string') { 
      count.receiver_info_name = 'receivers name not formatted correctly';
   }  

   if(typeof(message.receiver_info_picture) !== 'string') { 
      count.receiver_info_picture = 'picture name not formatted corectly';
   } 

   if(typeof(message.client_socket_id) !== 'string') { 
      count.client_socket_id = 'client socket id not formatted correctly';
   }

   let message_files_passed = true;
   if(((typeof(message.message_files) !== 'object') || (typeof(message.message_files) == 'object' && Array.isArray(message.message_files) == false) || (message.message_files.length > 10))) { 
      message_files_passed = false;
      count.message_files = 'message files not formatted correctly or exeeding 10 file limit';
   }

   if((typeof(message.message_text) !== 'string') || (typeof(message.message_text) == 'string' && message.message_text.length < 1) && (message_files_passed == true && message.message_files.length == 0)) { 
      count.message_text = 'message text not formatted correctly';
   }

   if(((typeof(message.admin_to_admin_or_admin_to_client_or_group) !== 'string') || ((typeof(message.admin_to_admin_or_admin_to_client_or_group) == 'string') && (message.admin_to_admin_or_admin_to_client_or_group !== 'group' && message.admin_to_admin_or_admin_to_client_or_group !== 'client' && message.admin_to_admin_or_admin_to_client_or_group !== 'admin')))) {
      count.admin_to_admin_or_admin_to_client_or_group = 'user type must be client admin or group';
   }

   if(typeof(message.time) !== 'string') { 
      count.time = 'time not formatted correctly';
   }

   let mb = new Blob([JSON.stringify(message.message_files)]).size / 1000000;

   if(mb > 5) { 
      count.limit_size = 'must be 5mb or less';
   }

   for(let i = 0; i < message.message_files.length; i++) {

      let extension =  message.message_files[i].file.split('/')[1].split(';')[0];

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
         count.files_input_error = 'the format of the files you are attempting to insert are not correct. files supported are png, jpg, docx, pdf, txt, pptx, img';
         break;
      }

      if(typeof(message.message_files[i].file_name) !== 'string') { 
         count.files_input_error = 'a file name is not of type string. please check the names of the files you are inserting';
         break;
      }

   }

   if(Object.keys(count).length > 0) { 
      for (const [key, value] of Object.entries(count)) {
         alert(`${value}`);
      }
      return;
   }

   if(state.focus_user.business_show_id == state.my_info.business_show_id) { 
      state.messages[state.my_info.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group].push(message); //s
   } else if(state.focus_user.socket_id == 'socket_id_is_not_set_redirect_message_to_http') { 
      state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group].push(message); //s
   } else if(state.focus_user.socket_id == 'group_message') { 
      state.messages[state.room_info.room_id + '_' + state.focus_user.user_type_admin_or_client_or_group].push(message); //d
   } else { 
      state.messages[state.focus_user.business_show_id + '_' + state.focus_user.user_type_admin_or_client_or_group].push(message); //s
   }

   $('#messages').append(await left_element($('#message_input_field').val(), message_files, state.my_info.name, state.my_info.user_src, message.time, message.message_id));
   $('#message_input_field').val('');
   $('#files_added_to_message').empty();
   $('#message_input_field').focus();
   message_files = [];

   socket.emit(state.room_info.room_id, message);

});

function delete_message(message_id) { 

   try {

      axios.post('http://localhost:3000/admin_chat_delete_message', { 

         message_id: message_id

      }).then(function (result) {

         result = result.data;

         if(result.response.type === 'server_error' && result.response.value !== '/?server=error, there is no message to delete') { 
            window.location.href = result.response.value;
            return;
         }

         if(result.response.type == 'successfully_deleted' || result.response.type === 'server_error' && result.response.value === '/?server=error, there is no message to delete') {

            let deleting_type = null;

            if(state.focus_user.user_type_admin_or_client_or_group == 'group') { 
               deleting_type = state.room_info.room_id;
            } else { 
               deleting_type = state.focus_user.business_show_id;
            }

            let messages = state.messages[deleting_type + '_' + state.focus_user.user_type_admin_or_client_or_group];

            for(let i = 0; i < messages.length; i++) { 
               if(messages[i].message_id == message_id) { 
                  messages.splice(i, 1);
                  state.messages[deleting_type + '_' + state.focus_user.user_type_admin_or_client_or_group] = messages;
                  break;
               }
            }

            $(`#${message_id}`).remove();

            if(result.value > 1) { 
               alert('hmm? more than one message was deleted in this instance... actually there were' + result.value);
            }

            return;

         }

         if(result.response.type === 'errors') { 
            alert('message id not in the correct format');
            return; 
         }

         window.location.href = '/?server=error on server, we are doing what we can to fix this - main';

      }).catch(function (err) {
         console.log(err);
      });

   } catch(err) { 
      alert(err);
   }

}

async function left_element(message, files, name, picture, time, id) { 

   picture = await image_selection(picture);

   let actual_files = [];

   if(typeof(files) == 'object' && Array.isArray(files) == true) { 
      actual_files = files;
   } else if(files !== 'no files') { 
      try { 
         actual_files = await image_selection(files); //not sure how this is working without parse
      } catch(err) { 
         console.log(err);
      }
   } 

   let string = ``;
   for(let i = 0; i < actual_files.length; i++) { 
      string += `<a  style = "color: white; text-decoration: underline" href="${actual_files[i].file}" download="${actual_files[i].file_name}">${actual_files[i].file_name}</a> <br>`;
   }

   return `
      <li id = "${id}">
      <div class="conversation-list">
      <div class="chat-avatar">
      <img src="${picture ? picture : '/images/wpressbunnyllclogonew.png'}" alt="" style = 'width: 100%; border-radius: 10px; background-color: white'>
      </div>
      <div class="user-chat-content">
      <div class="ctext-wrap">
      <div class="ctext-wrap-content">
      <p class="mb-0">
      ${message} <br> ${string}
      </p>
      <p class="chat-time mb-0"><i class="ri-time-line align-middle"></i> <span class="align-middle">${time}</span></p>
      </div>
      <div class="dropdown align-self-start">
      <a class="dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
      <i class="ri-more-2-fill"></i>
      </a>
      <div class="dropdown-menu">
      <a class="dropdown-item" href="#" onclick = "delete_message(${id})">Delete <i class="ri-delete-bin-line float-end text-muted"></i></a>
      </div>
      </div>
      </div>
      <div class="conversation-name">${name}</div>
      </div>
      </div>
      </li>`

}

async function right_element(message, files, name, picture, time, id) { 

   picture = await image_selection(picture);

   let actual_files = [];

   if(files !== 'no files') { 
      try { 
         actual_files = await image_selection(files);
      } catch(err) { 
         console.log(err);
      }
   } 

   let string = ``;
   for(let i = 0; i < actual_files.length; i++) { 
      string += `<a style = "text-decoration: underline" href="${actual_files[i].file}" download="${actual_files[i].file_name}">${actual_files[i].file_name}</a> <br>`;
   }

   return `
      <li class="right pull_last_one_down" id = "${id}">
      <div class="conversation-list">
      <div class="chat-avatar">
      <img src="${picture ? picture : '/images/wpressbunnyllclogonew.png'}" alt="" style = 'width: 100%; border-radius: 10px; background-color: white'>
      </div>
      <div class="user-chat-content">
      <div class="ctext-wrap">
      <div class="ctext-wrap-content">
      <p class="mb-0" style = "text-align: left">
      ${message} <br> ${string}
      </p>
      <p class="chat-time mb-0"><i class="ri-time-line align-middle"></i> <span class="align-middle">${time}</span></p>
      </div>
      </div>
      <div class="conversation-name">${name}</div>
      </div>
      </div>
      </li>`

}

$("#message_attachment_button").click(() => { 
   $('#hidden_file_button').click();
});

function delete_file(id) { 
   for(let i = 0; i < message_files.length; i++) { 
      if(message_files[i].id == id) { 
            message_files.splice(i, 1);
            if(message_files.length === 0) { 
               for(let j = 0; j < document.getElementsByClassName('delete_remaining_divs').length; j++) { 
                  document.getElementsByClassName('delete_remaining_divs')[j].remove();
               }
            }
         break;
      }
   }
   $(`#${id}`).remove();
}

$('#hidden_file_button').on('change', (e) => {
   
   let file = e.target.files[0];
   let file_name = file.name;
   let extension = file_name.split('.');
   extension = extension[extension.length - 1].toLowerCase();

   if(
      extension !== 'docx' &&
      extension !== 'pdf' &&
      extension !== 'pptx' &&
      extension !== 'png' &&
      extension !== 'jpg' &&
      extension !== 'img' &&
      extension !== 'txt' && 
      extension !== 'csv'
   ) { 
      alert('file type not supported');
      return;
   }

   const reader = new FileReader();

   reader.addEventListener("load", () => { 

      var result = reader.result;

      message_files.push({ 
         file: reader.result, 
         file_name: file_name,
         file_extension: extension,
         id: `file-${message_files.length + 1}`
      }); 

      $('#files_added_to_message').empty();

      for(let i = 0; i < message_files.length; i++) { 
         if(i % 1 === 0 && i >= 1) { 
            $('#files_added_to_message').append('<div class = "delete_remaining_divs" style = "margin-bottom: 8px; margin-top: 8px"></div>');
         }
         $('#files_added_to_message').append(`<span id = "${message_files[i].id}" onclick = "delete_file('${message_files[i].id}')" class = "file_attachment_popups">${message_files[i].file_name}</span>`);
      }

   }, false);

   if (file) { 
      reader.readAsDataURL(file); 
   }
   
});

const video = document.querySelector('#my_video');
const their_video = document.querySelector('#their_video');
let peer;
let group_peer = {};
let current_call = null;
let g_stream = null;
let toggle_vid = 'mine';
let toggle_vid_on_off = 'on';
let toggle_audio_on_off = 'on';
let toggle_vid_attr = { height: 300 };
let toggle_audio_attr = true;
let connected_to_peer_single = null;
let currently_calling = {};
let deletion_count_of_when_person_is_calling = {};

function init_video(g_peer) {
   peer = g_peer;
   peer.on('call', function(call) {
      $(`.hide_all_calling-${call.peer}`).attr("hidden", true);
      $(`#answer-${call.peer}`).attr("hidden", false);
      currently_calling[call.peer] = { 
         call: call, 
         expiration: Date.now() + 10000,
         count_down: function(p = call.peer) { 
            if(Date.now() > currently_calling[call.peer].expiration && typeof(currently_calling[call.peer]) == 'object') { 
               $(`.hide_all_calling-${call.peer}`).attr("hidden", true);
               $(`#call-${call.peer}`).attr("hidden", false);
               if(typeof(currently_calling[call.peer].call.close) == 'function') {
                  currently_calling[call.peer].call.close();
               }
               if(Object.keys(currently_calling).length == 1) { 
                  $('.ri-phone-line').css('color', '');
               }
               delete currently_calling[call.peer];
               return;
            } 
            $('.ri-phone-line').css('color', '#7269ef');
            $(`.hide_all_calling-${call.peer}`).attr("hidden", true);
            $(`#answer-${call.peer}`).attr("hidden", false);
            try {
               setTimeout(function(){
                  if(typeof(currently_calling[call.peer]) !== 'undefined') {
                     currently_calling[call.peer].count_down(); 
                  }
               }, 1000);
            } catch(err) { 
               return;
            }
         }
      }
      currently_calling[call.peer].count_down();
   });
   peer.on('connection', function(conn) { 
      if(current_call !== null && conn.peer == current_call.peer) {
         hangup(current_call.peer);
      }
      conn.close();
   })
}

let clear_red_timeout = null;
function flash_red(color, count) { 
   if(count == 4) { 
      return;
   }
   $('.ri-phone-line').css('color', color);
   count=count+1;
   if(count % 2 == 0) { 
      color = 'red';
   } else { 
      color = '';
   }
   clear_red_timeout = setTimeout(function(){ flash_red(color, count); }, 500);
}

$("#video_call_button").click(async function() { 
   if(state.socket_instances.length == 1) { 
      if(clear_red_timeout !== null) { 
         try { 
            clearTimeout(clear_red_timeout);
         } catch(err) { 
            console.log('error');
         }
      }
      flash_red('red', 0);
      return;
   }
   try {
      $('#videoCallModal').modal('toggle');
      g_stream = await navigator.mediaDevices.getUserMedia({ video: toggle_vid_attr, audio: toggle_audio_attr });
      video.srcObject = g_stream;
      video.onloadedmetadata = function(e) { video.play(); };
   } catch(err) {
      alert(err);
   }
});

$('#toggle_video_on_off').click(async function() { 
   if(typeof(current_call) == 'object' && current_call !== null) {
      return;
   }
   if(toggle_vid_on_off == 'on') { 
      toggle_vid_on_off = 'off';
      toggle_vid_attr = false;
      $('#toggle_video_on_off').text('off');
      $('#toggle_video_on_off').css("text-decoration", "line-through"); 
      g_stream = await navigator.mediaDevices.getUserMedia({ video: toggle_vid_attr, audio: toggle_audio_attr });
      video.srcObject = g_stream;
   } else { 
      toggle_vid_on_off = 'on';
      toggle_vid_attr = { height: 300 };
      $('#toggle_video_on_off').text('on');
      $('#toggle_video_on_off').css("text-decoration", "none"); 
      g_stream = await navigator.mediaDevices.getUserMedia({ video: toggle_vid_attr, audio: toggle_audio_attr });
      video.srcObject = g_stream;
   }
})

$('#toggle_audio_on_off').click(async function() { 
   if(typeof(current_call) == 'object' && current_call !== null) { 
      return;
   }
   if(toggle_audio_on_off == 'on') { 
      toggle_audio_on_off = 'off';
      toggle_audio_attr = false;
      $('#toggle_audio_on_off').text('off');
      $('#toggle_audio_on_off').css("text-decoration", "line-through"); 
      g_stream = await navigator.mediaDevices.getUserMedia({ video: toggle_vid_attr, audio: toggle_audio_attr });
      video.srcObject = g_stream;
   } else { 
      toggle_audio_on_off = 'on';
      toggle_audio_attr = true;
      $('#toggle_audio_on_off').text('on');
      $('#toggle_audio_on_off').css("text-decoration", "none"); 
      g_stream = await navigator.mediaDevices.getUserMedia({ video: toggle_vid_attr, audio: toggle_audio_attr });
      video.srcObject = g_stream;
   }
})

$('#toggle_video').click(function() { 
   if(toggle_vid == 'mine') {
      toggle_vid = 'theirs';
      $('#my_video').attr("hidden", true);
      $('#their_video').attr("hidden", false);
      $('#toggle_video').text('toggle: participant');
   } else { 
      toggle_vid = 'mine';
      $('#their_video').attr("hidden", true);
      $('#my_video').attr("hidden", false);
      $('#toggle_video').text('toggle: me');
   }
})

let clear_this_timeout_every_call = null;
async function make_call(socket_id) {
   try {
      if(typeof(current_call) == 'object' && current_call !== null) { 
         hangup(current_call.peer);
      }
      if(typeof(currently_calling[socket_id]) !== 'undefined') { 
         delete currently_calling[socket_id];
      }
      current_call = peer.call(socket_id, g_stream);
      $(`.hide_all_calling-${socket_id}`).attr("hidden", true);
      $(`#calling-${socket_id}`).attr("hidden", false);
      $(`#hangup-${socket_id}`).attr("hidden", false);
      let ex = Date.now() + 10000;
      if(clear_this_timeout_every_call !== null) { 
         try {
            clearTimeout(clear_this_timeout_every_call);
         } catch(err) { 
            console.log(err);
         }
      }
      wait_for_nine_tics_and_hangup(ex);
   } catch(err) {
      alert(err);
   }
}

function wait_for_nine_tics_and_hangup(expiration) { 
   if(typeof(current_call) == 'object' && current_call !== null && current_call.open == true) {
      clearTimeout(clear_this_timeout_every_call);
      $(`.hide_all_calling-${current_call.peer}`).attr("hidden", true);
      $(`#hangup-${current_call.peer}`).attr("hidden", false);
      c_stream();
      return;
   }
   if(Date.now() > expiration) {
      clearTimeout(clear_this_timeout_every_call);
      if(typeof(current_call) == 'object' && current_call !== null) {
         hangup(current_call.peer); 
      }
      return;
   }
   clear_this_timeout_every_call = setTimeout(function(){ wait_for_nine_tics_and_hangup(expiration); }, 1000);
} 

function answer_call(socket_id) { 
   if(typeof(current_call) == 'object' && current_call !== null) { 
      hangup(current_call.peer);
   }
   $(`.hide_all_calling-${socket_id}`).attr("hidden", true);
   $(`#hangup-${socket_id}`).attr("hidden", false);        
   current_call = currently_calling[socket_id].call;
   current_call.answer(g_stream);
   if(Object.keys(currently_calling).length == 1) { 
      $('.ri-phone-line').css('color', '');
   }
   delete currently_calling[socket_id];
   c_stream();
}

function c_stream() {
   for(let i = 0; i < state.socket_instances.length; i++) { 
      if(state.socket_instances[i].socket_id == current_call.peer) { 
         $('#currently_on_call_with').text(state.socket_instances[i].user_name);
         break;
      }
   }
   current_call.on('stream', (stream) => {
      their_video.srcObject = stream;
   });
   current_call.on('error', function() { 
      hangup(current_call.peer);
   })
   their_video.onloadedmetadata = function(e) { 
      their_video.play();
   };
}

function hangup(socket_id) { 
   try{ 
      if(typeof(current_call) == 'object' && current_call !== null && typeof(current_call.close) == 'function') {
         current_call.close();
         let id = current_call.peer;
         current_call = null;
         peer.connect(id);
      }
      $(`.hide_all_calling-${socket_id}`).attr("hidden", true);
      $(`#call-${socket_id}`).attr("hidden", false);
      $('#currently_on_call_with').text('no one');
   } catch(err) { 
      alert(err);
   }
}

$('#videoCallModal').on('hidden.bs.modal', function () {
   try {
      if(typeof(current_call) == 'object' && current_call !== null) { 
         hangup(current_call.peer);
      }
      g_stream.getTracks().forEach(function(track) {
         track.stop();
      });
      g_stream = null;
   } catch(err) { 
      alert(err);
   }
});

function reinstantiate_the_correct_element_from_current_call() { 
   if(typeof(current_call) == 'object' && current_call !== null && current_call.open == true) { 
      $(`.hide_all_calling-${current_call.peer}`).attr("hidden", true);
      $(`#hangup-${current_call.peer}`).attr("hidden", false);
   } else if(typeof(current_call) == 'object' && current_call !== null && current_call.open == false) { 
      $(`.hide_all_calling-${current_call.peer}`).attr("hidden", true);
      $(`#calling-${current_call.peer}`).attr("hidden", false);
      $(`#hangup-${current_call.peer}`).attr("hidden", false);
   }
}
