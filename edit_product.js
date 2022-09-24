let product_id_g;
let product_image_set_g = [];
let subscription_duration_g;
let product_add_image_global_count;
let product_file_name_g;

//example of editing a product FRONT END EXAMPLE

function edit_product_info(title, category, description, price, hidden, product_id, product_file_id, product_hidden_link) {
    product_id_g = product_id;
    hidden = hidden == 1 ? true : false;
    $('#edit_product_title_input').val(title);
    $('#edit_product_category_input').val(category);
    $('#edit_product_description_input').val(description);
    $('#edit_product_hidden_link_input').val(product_hidden_link);
    $('#edit_product_price_input').val(price);
    $("#edit_product_hidden_input").attr("checked", hidden);
    $("#edit_product_hidden_input").prop("checked", hidden);
    $('#editProductModal').modal('toggle');
}

$('#edit_product_in_this_room').click(function() { 

    $('#edit_product_title_input_error').text('');
    $('#edit_product_category_input_error').text('');
    $('#edit_product_description_input_error').text('');
    $('#edit_product_hidden_link_input_error').text('');
    $('#edit_product_price_input_error').text('');

    let product_title = $('#edit_product_title_input').val();
    let product_category = $('#edit_product_category_input').val();
    let product_description = $('#edit_product_description_input').val();
    let product_hidden_link = $('#edit_product_hidden_link_input').val();
    let product_price = $('#edit_product_price_input').val();
    let product_hidden = $('#edit_product_hidden_input').is(":checked");

    let count = 0;

    if(typeof(product_title) !== 'string' || product_title.length < 3 || product_title.length > 254) { 
       $("#edit_product_title_input_error").text('product title must be more than 2 characters');
       count++;
    }

    if(typeof(product_category) !== 'string' || product_category.length < 3 || product_category.length > 254) { 
       $("#edit_product_category_input_error").text('product category must be more than 2 characters');
       count++;
    }

    if(typeof(product_description) !== 'string' || product_description.length < 3 || product_description.length > 254) { 
       $("#edit_product_description_input_error").text('product description must be more than 2 characters');
       count++;
    }

    if(typeof(product_hidden_link) !== 'string' || product_hidden_link.length > 254) { 
      $("#edit_product_hidden_link_input_error").text('product hidden link must be less than 255 characters');
      count++;
   }

    if(typeof(product_price) !== 'string' || product_price < 2 || product_price > 1000) { 
       $("#edit_product_price_input_error").text('price must be more than $1');
       count++;
    }

    if(typeof(product_hidden) !== 'boolean') { 
       product_hidden = false;
    }

    if(count > 0) { 
       return;
    }  

    try {

       axios.post('http://localhost:3000/admin_chat_edit_product_main', {

          product_title: product_title,

          product_category: product_category,

          product_description: product_description,

          product_hidden_link: product_hidden_link,

          product_price: product_price,

          product_hidden: product_hidden,

          product_id: product_id_g

       }).then(function (result) {

          result = result.data;

          if(result.response.type === 'server_error') { 
             window.location.href = result.response.value;
             return;
          }

          if(result.response.type == 'this_rooms_products') { 

             for(let i = 0; i < state.products.length; i++) { 
                if(state.products[i].id == product_id_g) { 
                   state.products[i].title = product_title;
                   state.products[i].category = product_category;
                   state.products[i].description = product_description;
                   state.products[i].hidden_link = product_hidden_link;
                   state.products[i].hidden = product_hidden == false ? 0 : 1;
                   state.products[i].price = parseFloat(product_price).toFixed(2);
                   state.products[i].price = parseFloat(product_price);
                   break;
                }
             }

             load_products();

             $('#editProductModal').modal('toggle');
             $('#edit_product_title_input').val('');
             $('#edit_product_category_input').val('');
             $('#edit_product_description_input').val('');
             $('#edit_product_hidden_link_input').val('');
             $('#edit_product_price_input').val('');

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

function edit_product_subscription(duration, product_type, product_id) {

    $('.weekly_focus_input').css("font-size", "");
    
    product_id_g = product_id;

    if(duration == 'weekly') { 
       subscription_duration_g = 'weekly';
       $("#edit_product_weekly_focus").css("font-size", "xx-large");
    }

    if(duration == 'biweekly') { 
       subscription_duration_g = 'biweekly';
       $("#edit_product_biweekly_focus").css("font-size", "xx-large");
    }

    if(duration == 'monthly') { 
       subscription_duration_g = 'monthly';
       $("#edit_product_monthly_focus").css("font-size", "xx-large");
    }

    if(duration == 'quarterly') { 
       subscription_duration_g = 'quarterly';
       $("#edit_product_quarterly_focus").css("font-size", "xx-large");
    }

    if(duration == 'yearly') { 
       subscription_duration_g = 'yearly';
       $("#edit_product_yearly_focus").css("font-size", "xx-large");
    }

    $("#edit_product_subscription_input").attr("checked", product_type);
    $("#edit_product_subscription_input").prop("checked", product_type);

    $('#editProductSubscriptionModal').modal('toggle');

}

$('.weekly_focus_input').click(function() { 

    $('.weekly_focus_input').css("font-size", "");

    let id = this.id;

    if(id == 'edit_product_weekly_focus') { 
       subscription_duration_g = 'weekly';
       $("#edit_product_weekly_focus").css("font-size", "xx-large");
    }

    if(id == 'edit_product_biweekly_focus') { 
       subscription_duration_g = 'biweekly';
       $("#edit_product_biweekly_focus").css("font-size", "xx-large");
    }

    if(id == 'edit_product_monthly_focus') { 
       subscription_duration_g = 'monthly';
       $("#edit_product_monthly_focus").css("font-size", "xx-large");
    }

    if(id == 'edit_product_quarterly_focus') { 
       subscription_duration_g = 'quarterly';
       $("#edit_product_quarterly_focus").css("font-size", "xx-large");
    }

    if(id == 'edit_product_yearly_focus') { 
       subscription_duration_g = 'yearly';
       $("#edit_product_yearly_focus").css("font-size", "xx-large");
    }

});

$('#edit_product_in_this_room_subscription').click(function() { 

    let product_is_subscription = $('#edit_product_subscription_input').is(":checked");

    try {

       axios.post('http://localhost:3000/admin_chat_edit_product_subscription', {

          is_this_product_a_subscription: product_is_subscription,

          product_subscription_duration: subscription_duration_g,

          product_id: product_id_g

       }).then(function (result) {

          result = result.data;

          if(result.response.type === 'server_error') { 
             window.location.href = result.response.value;
             return;
          }

          if(result.response.type == 'this_rooms_products') { 

             for(let i = 0; i < state.products.length; i++) { 
                if(state.products[i].id == product_id_g) { 
                   state.products[i].duration = subscription_duration_g;
                   state.products[i].product_type = product_is_subscription;
                   break;
                }
             }

             load_products();

             $('#editProductSubscriptionModal').modal('toggle');

             return;

          }

          if(result.response.type === 'errors') { 
             for (const [key, value] of Object.entries(result.response.value)) {
                alert(`${key} - ${value}`);
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

async function edit_product_images(file, product_id) {

    let images = await image_selection(file);
    
    product_add_image_global_count = 0;
    product_file_name_g = file;
    product_id_g = product_id;
    images = images.split('***img_separator***');
    product_image_set_g = images[0] !== '' ? images : [];

    $('#edit_product_image_view').prop('src', product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png');
    $('#edit_product_image_view').attr('src', product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png');

    if(images[0] !== null && images[0] !== 'null') {
       $(".images-galaore").unbind();
       $('#edit_product_image_view').click(function(){view_single_image(product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png')});
    }

    $('#edit_product_images_modal').modal('toggle');

}

$('#open_files_for_product_images').click(function() { 
    $('#hidden_file_button_for_product_images').click();
});

$('#hidden_file_button_for_product_images').on('change', (e) => {

    let file = e.target.files[0];
    let file_name = file.name;
    let extension = file_name.split('.');
    extension = extension[extension.length - 1].toLowerCase();

    if(
       extension !== 'png' &&
       extension !== 'jpg'
    ) { 
       alert('only png and jpg files are supported');
       return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => { 

       var result = reader.result;
       product_image_set_g.push(reader.result);
       product_add_image_global_count = product_image_set_g.length - 1;
       $('#edit_product_image_view').prop('src', product_image_set_g[product_add_image_global_count]);
       $('#edit_product_image_view').attr('src', product_image_set_g[product_add_image_global_count]);
       $(".images-galaore").unbind();
       $('#edit_product_image_view').click(function(){view_single_image(product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png')});

    }, false);

    if (file) { 
       reader.readAsDataURL(file); 
    }
        
});

$('#move_forward_through_product_images').click(function() { 
    if(product_image_set_g.length - 1 < 0) return
    product_add_image_global_count = product_add_image_global_count ==  product_image_set_g.length - 1 ? 0 : product_add_image_global_count + 1;
    $('#edit_product_image_view').prop('src', product_image_set_g[product_add_image_global_count]);
    $('#edit_product_image_view').attr('src', product_image_set_g[product_add_image_global_count]);
    $(".images-galaore").unbind();
    $('#edit_product_image_view').click(function(){view_single_image(product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png')});
});

$('#delete_single_product_image').click(function() { 
    try { 
       product_image_set_g.splice(product_add_image_global_count, 1);
       if(product_image_set_g.length - 1 < 0) { 
          product_add_image_global_count = 0;
          $('#edit_product_image_view').prop('src', '/images/wpressbunnyllclogonew.png');
          $('#edit_product_image_view').attr('src', '/images/wpressbunnyllclogonew.png');
       } else { 
          product_add_image_global_count = product_add_image_global_count == 0 ? product_image_set_g.length - 1 : product_add_image_global_count - 1;
          $('#edit_product_image_view').prop('src', product_image_set_g[product_add_image_global_count]);
          $('#edit_product_image_view').attr('src', product_image_set_g[product_add_image_global_count]);
          $(".images-galaore").unbind();
          $('#edit_product_image_view').click(function(){view_single_image(product_image_set_g[product_add_image_global_count] ? product_image_set_g[product_add_image_global_count] : '/images/wpressbunnyllclogonew.png')});
       }
    } catch(err) {  
       alert(err);
    }
});

$('#edit_product_in_this_room_images').click(function() { 

    let mb = new Blob([product_image_set_g.join('***img_separator***')]).size / 1000000;

    if(mb > 0.5) {
       alert('file size limit exceeded. 0.5 mb limit')
       return;
    }

    if(product_image_set_g.length > 9) { 
       alert('10 images per product');
       return;
    }

    for(let i = 0; i < product_image_set_g.length; i++) { 

       let extension = product_image_set_g[i].split('/')[1].split(';')[0];

       if(extension !== 'jpeg' && extension !== 'png') { 
          alert('only jpg and png files supported');
          return;
       }

       if(product_image_set_g[i].includes('***img_separator***')) { 
          alert('***img_separator*** is a key word that is in one of your pictures');
          return;
       }

    }

    try {

       axios.post('http://localhost:3000/admin_chat_edit_product_pictures', {

          product_images: product_image_set_g,

          product_id: product_id_g

       }).then(function (result) {

          result = result.data;

          if(result.response.type === 'server_error') { 
             window.location.href = result.response.value;
             return;
          }

          if(result.response.type == 'this_rooms_products') { 
             state.image_cache[product_file_name_g] = product_image_set_g.join('***img_separator***');
             $('#edit_product_images_modal').modal('toggle');
             return;
          }

          if(result.response.type === 'errors') { 
             for (const [key, value] of Object.entries(result.response.value)) {
                alert(`${key} - ${value}`);
             }
             return;   
          }

          window.location.href = '/?server=error on server, we are doing what we can to fix this - main';

       }).catch(function (err) {
          alert(err);
       });

    } catch(err) { 
       alert(err);
    }

});

function remove_product(product_id) {
    product_id_g = product_id;
    $('#delete_product_modal').modal('toggle');
}

$('#delete_this_product').click(function() { 

    try {

       axios.post('http://localhost:3000/admin_chat_delete_product', {

          product_id: product_id_g

       }).then(function (result) {

          result = result.data;

          if(result.response.type === 'server_error') { 
             window.location.href = result.response.value;
             return;
          }

          if(result.response.type == 'this_rooms_products') { 

             for(let i = 0; i < state.products.length; i++) { 
                if(state.products[i].id == product_id_g) { 
                   state.products.splice(i, 1);
                   break;
                }
             }

             load_products();

             $('#delete_product_modal').modal('toggle');

             return;

          }

          if(result.response.type === 'errors') { 
             for (const [key, value] of Object.entries(result.response.value)) {
                alert(`${key} - ${value}`);
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
