let task_id_g = null;
let set_to_sort_g = null;

//editing, bubble sorting (by date) and redisplaying tasks

function edit_task_modal(description, due, assigned, task_id, set_to_sort) {
    task_id_g = task_id;
    set_to_sort_g = set_to_sort;
    $("#edit_task_description_input").val(description);
    $("#edit_task_due_input").val(due.split('T')[0]); 
    $("#edit_task_assigned_input").val(assigned);
    $('#editTaskModal').modal('show');
}

$('#edit_task_in_this_room').click(function() {

    $("#edit_task_description_input_error").text('');
    $("#edit_task_due_input_error").text('');
    $("#edit_task_assigned_input_error").text('');
 
    let task_description = $("#edit_task_description_input").val();
    let task_due = $("#edit_task_due_input").val();
    let task_assigned_to = $("#edit_task_assigned_input").val();
  
    var count = 0;

    if(typeof(task_description) !== 'string' || task_description.length < 3 || task_description.length > 254) { 
       $("#edit_task_description_input_error").text('Task description must be at least 2 characters');
       count++;
    }
 
    if(task_due === '' || task_due === null) { 
      task_due = null;
    } else { 
      task_due = new Date(task_due);
      let month = task_due.getMonth();
      let year = task_due.getFullYear();
      let day = task_due.getDate();
      task_due = `${year}-${month+1}-${day+1}`;
    }
    
    if(!task_due instanceof Date && task_due !== null) { 
       $("#edit_task_due_input_error").text('task due must be a date. type nothing for recurring tasks');
       count++;
    }
 
    if(typeof(task_assigned_to) !== 'string' || task_assigned_to.length > 254) { 
       $("#edit_task_assigned_input_error").text('The task must be assigned to an email in the department or left blank');
       count++;
    }
 
    if(count > 0) { 
       return;
    }
 
    try {
 
       axios.post('http://localhost:3000/admin_chat_edit_task', {
 
          task_description: task_description,
 
          task_due: task_due,
 
          task_assigned_to: task_assigned_to,

          task_id: task_id_g
 
       }).then(function (result) {
 
          result = result.data;
 
          if(result.response.type === 'server_error') { 
             window.location.href = result.response.value;
             return;
          }
 
          if(result.response.type === 'task_edited') { 

            if(task_due !== null && task_due !== 'null' && task_due !== '') { 
               task_due = task_due.split('-');
               if(task_due[1].length === 1) {  task_due[1] = 0 + task_due[1]; }
               if(task_due[2].length === 1) { task_due[2] = 0 + task_due[2]; }
               task_due = task_due[0] + '-' + task_due[1] + '-' + task_due[2] + 'T04:00:00.000Z';
            }

            let iterating_through;
            let function_;

            if(set_to_sort_g === 'mine') { 
               iterating_through = 'my_tasks';
               function_ = load_my_tasks;
            } else if(set_to_sort_g === 'free') { 
               iterating_through = 'free_tasks';
               function_ = load_free_tasks;
            } else { 
               iterating_through = 'other_tasks';
               function_ = load_other_tasks;
            }

            for(let i = 0; i < state[iterating_through].length; i++) { 
               if(state[iterating_through][i].id == task_id_g) { 
                  state[iterating_through][i].owned_by_email = task_assigned_to;
                  state[iterating_through][i].due_by = task_due;
                  state[iterating_through][i].description = task_description;
                  break;
               }
            }

            for(let i = 0; i < state[iterating_through].length; i++) { //could splice and iterate 2logn vs n^2
               for(let j = 0; j < state[iterating_through].length; j++) { 
                  if(typeof(state[iterating_through][j+1]) !== 'undefined') {
                     if((state[iterating_through][j].due_by !== null && state[iterating_through][j+1].due_by === null) || (new Date(state[iterating_through][j+1].due_by) < new Date(state[iterating_through][j].due_by))) { 
                       let temp = state[iterating_through][j];
                       state[iterating_through][j] = state[iterating_through][j+1];
                       state[iterating_through][j+1] = temp;
                     } 
                  }
               }
            }

            function_();

            $("#edit_task_description").val('');
            $("#edit_task_due").val('');
            $("#edit_task_assigned_to").val('');
            $('#editTaskModal').modal('hide');
            return;

          }
 
          if(result.response.type === 'errors') { 
            for (const [key, value] of Object.entries(result.response.value)) {
                $(`#${key}`).text(value);
            }
            return;
          }
 
          window.location.href = '/?server=error on server, we are doing what we can to fix this - main';
 
       }).catch(function (err) {
          console.log(err);
       });
 
    } catch(err) { 
       alert(err);
    }
 
});
