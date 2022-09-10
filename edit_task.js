let task_id_g = null;
let set_to_sort_g = null;

//pulling up a modal and editing three types of tasks

function edit_task_modal(description, due, assigned, task_id, set_to_sort) {
    $("#edit_task_description_input").val(description);
    if(due !== null) {
      if(due.includes('T')) { //value from db not edited
         due = due.split('T')[0];
      } else { //value that was edited
         due = due.split('-');
         if(due[1].length === 1) { 
            due[1] = 0 + due[1];
         }
         if(due[2].length === 1) { 
            due[2] = 0 + due[2];
         }
         due = due[0] + '-' + due[1] + '-' + due[2];
      }
      $("#edit_task_due_input").val(due); 
    }
    $("#edit_task_assigned_input").val(assigned);
    task_id_g = task_id;
    set_to_sort_g = set_to_sort;
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

            if(set_to_sort_g === 'mine') { 

               for(let i = 0; i < state.my_tasks.length; i++) { 
                  if(state.my_tasks[i].id == task_id_g) { 
                     state.my_tasks[i].owned_by_email = task_assigned_to;
                     state.my_tasks[i].due_by = task_due;
                     state.my_tasks[i].description = task_description;
                     break;
                  }
               }
                
               //below or splicing known value, iterating once, checking and pushing

               for(let i = 0; i < state.my_tasks.length; i++) { //could create three variables instead of if else
                  for(let j = 0; j < state.my_tasks.length; j++) { 
                     if(typeof(state.my_tasks[j+1]) !== 'undefined') {
                        if(state.my_tasks[j].due_by !== null && state.my_tasks[j+1].due_by !== null) { 
                           if(new Date(state.my_tasks[j+1].due_by) < new Date(state.my_tasks[j].due_by)) { 
                              let temp = state.my_tasks[j];
                              state.my_tasks[j] = state.my_tasks[j+1];
                              state.my_tasks[j+1] = temp;
                           }                        
                        } 
                     }
                  }
               }

               load_my_tasks();

            } else if(set_to_sort_g === 'free') { 

               for(let i = 0; i < state.free_tasks.length; i++) { 
                  if(state.free_tasks[i].id == task_id_g) { 
                     state.free_tasks[i].owned_by_email = task_assigned_to;
                     state.free_tasks[i].due_by = task_due;
                     state.free_tasks[i].description = task_description;
                     break;
                  }
               }

               for(let i = 0; i < state.free_tasks.length; i++) { 
                  for(let j = 0; j < state.free_tasks.length; j++) { 
                     if(typeof(state.free_tasks[j+1]) !== 'undefined') {
                        if(state.free_tasks[j].due_by !== null && state.free_tasks[j+1].due_by !== null) { 
                           if(new Date(state.free_tasks[j+1].due_by) < new Date(state.free_tasks[j].due_by)) { 
                              let temp = state.free_tasks[j];
                              state.free_tasks[j] = state.free_tasks[j+1];
                              state.free_tasks[j+1] = temp;
                           }                        
                        } 
                     }
                  }
               }

               load_free_tasks();

            } else { 

               for(let i = 0; i < state.other_tasks.length; i++) { 
                  if(state.other_tasks[i].id == task_id_g) { 
                     state.other_tasks[i].owned_by_email = task_assigned_to;
                     state.other_tasks[i].due_by = task_due;
                     state.other_tasks[i].description = task_description;
                     break;
                  }
               }

               for(let i = 0; i < state.other_tasks.length; i++) { 
                  for(let j = 0; j < state.other_tasks.length; j++) { 
                     if(typeof(state.other_tasks[j+1]) !== 'undefined') {
                        if(state.other_tasks[j].due_by !== null && state.other_tasks[j+1].due_by !== null) { 
                           if(state.other_tasks[j+1].due_by < state.other_tasks[j].due_by) { 
                              let temp = state.other_tasks[j];
                              state.other_tasks[j] = state.other_tasks[j+1];
                              state.other_tasks[j+1] = temp;
                           }                        
                        } 
                     }
                  }
               }

               load_other_tasks();

            }

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
