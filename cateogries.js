let product_array_attaching_to_g = [];
let product_id_attaching_to_g = null;

//attaching categories with a concatenated string... avoids parsing error

function open_product_attachment_modal(id, currently_attaching) {

    if(currently_attaching === null || currently_attaching === '' || currently_attaching === 'null') {
        currently_attaching = null;
    } else { 
        try {
            currently_attaching = currently_attaching.split('***categorySeperator***');
        } catch(err) { 
            currently_attaching = null;
        }
    }

    let seperator_error = false;

    if(typeof(currently_attaching) === 'object' && Array.isArray(currently_attaching) === true) { 
        seperator_error = seperator_error_(currently_attaching);
    }

    if((typeof(currently_attaching) !== 'object' || Array.isArray(currently_attaching) === false) || seperator_error === true) { 
        currently_attaching = [];
    }

    product_array_attaching_to_g = currently_attaching;
    product_id_attaching_to_g = id;

    display_categories();

    $('#addProductAttachmentsModal').modal('toggle');

}

$('#add_product_attachment').click(function() { 

    let category = $('#add_product_attachment_option_category').val();
    let option_amount = $('#add_product_attachment_option_amount').val();

    option_amount = parseInt(option_amount);

    let error_count = 0;

    if((category === null || category === '' || category.length < 2 || category.includes('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk'))) { 
        error_count++;
    }

    if((typeof(option_amount) !== 'number') || (typeof(option_amount) === 'number' && option_amount % 1 !== 0) || option_amount < 1) {
        error_count++;
    }

    for(let i = 0; i < product_array_attaching_to_g.length; i++) { 
        if(product_array_attaching_to_g[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[0] === category) { 
            error_count++;
            break;
        }
    }

    if(error_count > 0) { 
        return;
    }

    product_array_attaching_to_g.push(`${category}rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk${option_amount}`);

    update_product_attachments_in_db();
    display_categories();

    $('#add_product_attachment_option_category').val('');
    $('#add_product_attachment_option_amount').val('');

});

function delete_product_attachment(category) { 

    for(let i = 0; i < product_array_attaching_to_g.length; i++) { 
        if(product_array_attaching_to_g[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[0] == category) { 
            product_array_attaching_to_g.splice(i, 1);
            break;
        }
    }

    update_product_attachments_in_db();
    display_categories();

}

function display_categories() { 

    $('#product_attachments').empty();

    for(let i = 0; i < product_array_attaching_to_g.length; i++) { 
        $('#product_attachments').append(`
            <div style = "margin-top: 5px; padding: 10px; border: 1px solid primary"> 
                <span>${product_array_attaching_to_g[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[0]}</span><br> 
                <span>${product_array_attaching_to_g[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[1]}</span>&nbsp; 
                <span style = "float: right; cursor: pointer" onclick = "delete_product_attachment('${product_array_attaching_to_g[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[0]}')" style = "cursor: pointer">X</span> 
            </div>
            <hr>
        `);
    }

}

function seperator_error_(currently_attaching) { 

    let seperator_error = false;

    for(let i = 0; i < currently_attaching.length; i++) { 

        let category = currently_attaching[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[0];
        let amount = parseInt(currently_attaching[i].split('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')[1]);

        if(typeof(category) !== 'string' || category.length < 2 || category.includes('rnrhhhfjf7784784jfjf884jfjfmfmfmfmfmfmfmfmfmfmnnnnfbbfnfnfbfbfbfbfbf58859585jjfjfk')) {
            seperator_error = true;
            break;
        }

        if(typeof(amount) !== 'number' || (typeof(amount) === 'number' && amount % 1 !== 0) || amount < 1) {
            seperator_error = true;
            break;
        }

    }

    return seperator_error;

}

function update_product_attachments_in_db() { 

    let seperator_error = false;

    if(typeof(product_array_attaching_to_g) === 'object' && Array.isArray(product_array_attaching_to_g) === true) { 
        seperator_error = seperator_error_(product_array_attaching_to_g);
    } else { 
        product_array_attaching_to_g = [];
    }

    if(seperator_error === true) { 
        product_array_attaching_to_g = [];
    }

    try {

        axios.post('http://localhost:3000/hjhbhj', {
  
           attachment_categories: product_array_attaching_to_g,

           product_id: product_id_attaching_to_g
  
        }).then(function (result) {
  
           result = result.data;
  
           if(result.response.type === 'server_error') { 
              window.location.href = result.response.value;
              return;
           }
  
           if(result.response.type === 'update_complete') { 

                for(let i = 0; i < state.products.length; i++) { 
                    if(state.products[i].id == product_id_attaching_to_g) { 
                        state.products[i].attachment_categories = product_array_attaching_to_g.join('***categorySeperator***');
                        break;
                    }
                }
            
                load_products();
            
                return;

            }
  
           if(result.response.type === 'errors') { 
              alert(result.response.value);
              return;
           }
  
           window.location.href = '/?server=error on server, we are doing what we can to fix this main';
  
        }).catch(function (err) {
           console.log(err);
        });
  
     } catch(err) { 
        alert(err);
     }

}
