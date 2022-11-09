<?php

use Illuminate\Support\Facades\Route;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Exceptions\Handler;
use Mail as mail;

//require_once(base_path('vendor/location-master/src/Location.php'));
//$location = new Stevebauman\Location\Location;
//$string = preg_replace('/\s+/', '', $string);

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

//this is old php code for a service application I made a while ago. it used a payment gateway.

Route::get('/', function () {
    return view('home');
});

//home 

Route::get('/about', function () {
    return view('about');
});

//home 

Route::get('/appointment', function () {
    
    if(Session::get('login_lock_count_cli') > 8) { 
        return redirect('/?error=max logins attempted');
    }
    
    return view('appointment');
    
});

//home 

Route::get('/partnership', function () {
    
    if(Session::get('login_lock_count_adm') > 8) { 
        return redirect('/?error=max logins attempted');
    }
    
    return view('partnership');
    
});

//home 

Route::get('/services', function () {
    return view('service');
});

//home 

Route::get('/legal', function () {
    return view('legal');
});

//home 

Route::get('/confirmation', function () {
    return view('confirmation');
});

//home 

Route::get('/internship', function () {
    
    if(Session::get('login_lock_count_at') > 8) { 
        return redirect('/?error=max logins attempted');
    }
    
    return view('internship');
    
});

//home 

Route::get('/login', function () {
    
    if(Session::get('login_lock_count') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    return view('login');
    
});

//home 

Route::get('/reset', function () {
    
    if(Session::get('login_lock_count_pr') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    return view('reset');
    
});

//client

Route::get('/client', function (Request $request) {
    
    if($request->session()->has('user_session_client_id') && Session::get('user_session_client_logged_in') === true && Session::get('user_session_client_id') !== null && Session::get('user_session_client_id') !== '') {
        
        $user_info = DB::table('users')->select('user_id', 'user_name', 'user_email', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['user_type', '=', 1]])->limit(1)->get();

        $subscriptions = DB::table('users')->select('id', 'client_subscription_id', 'client_customer_id', 'client_subscription_status', 'client_assigned_admin', 'client_subscription_price', 'client_service_description', 'user_requested_subscription_cancel', 'user_time_since_last_subscription_update', 'client_sub_duration', 'client_cancel_date')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['client_user_id_for_sub', '=', $user_info[0]->user_id], ['user_type', '=', 0]])->get(); //SAY CLIENT ID HERE TOO
        
        $total = 0;
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
        foreach($subscriptions as $subscription) { 
            
            try {
                
                usleep(10005);
            
                $client_subscription_status = $stripe->subscriptions->retrieve(
                  $subscription->client_subscription_id,
                  []
                ); 
                
                $client_subscription_customer_match = $client_subscription_status->customer === $subscription->client_customer_id ? 'match' : 'mismatch';
                
                DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['id', '=', $subscription->id]])->limit(1)->update(['client_subscription_customer_match' => $client_subscription_customer_match]); //just say id here
                
                $client_subscription_status = $client_subscription_status->status === 'active' ? 'active' : 'inactive';
                
                DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['id', '=', $subscription->id]])->limit(1)->update(['client_subscription_status' => $client_subscription_status]); //just say id here
                
                $subscription->client_subscription_customer_match = $client_subscription_customer_match;
                $subscription->client_subscription_status = $client_subscription_status; 
            
            } catch(Exception $e) { 
                
                DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['id', '=', $subscription->id]])->limit(1)->update(['client_subscription_customer_match' => 'mismatch']); //just say id here... would be lost
                $subscription->client_subscription_customer_match = 'mismatch';
                
            }
            
            $total += $subscription->client_subscription_price;
            
            $client_assigned_admin_info = DB::table('users')->select('user_name', 'user_email', 'user_phone', 'admin_company_address')->where([['user_id', '=', $subscription->client_assigned_admin]])->limit(1)->get();
            
            $subscription->admin_user_name = $client_assigned_admin_info[0]->user_name;
            $subscription->admin_user_email = $client_assigned_admin_info[0]->user_email;
            $subscription->admin_user_phone = $client_assigned_admin_info[0]->user_phone;
            $subscription->admin_business_address = $client_assigned_admin_info[0]->admin_company_address;

        }

        return view('client', [
            'user_info' => $user_info, 
            'subscriptions' => $subscriptions,
            'total' => $total
        ]);

    } else { 
        
        return redirect('/login');

    }
    
});

//admin 

Route::get('/admin', function (Request $request) {
    
    if($request->session()->has('user_session_admin_id') && Session::get('user_session_admin_logged_in') === true && Session::get('user_session_admin_id') !== '' && Session::get('user_session_admin_id') !== null) { 
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
        $user_info = DB::table('users')->select('user_id', 'user_name', 'user_email', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'user_id', 'user_status', 'admin_connected_acct_id', 'admin_assigned_trainer', 'admin_subscription_status', 'admin_subscription_id', 'admin_signed_up_for_subscription', 'admin_company_address', 'admin_default_service_description', 'admin_subscription_customer_match', 'admin_customer_id', 'user_requested_subscription_cancel', 'user_W9')->where([['user_session_id', '=', Session::get('user_session_admin_id')], ['user_type', '=', 2]])->limit(1)->get();
        
        $clients = DB::table('users')->select('user_name', 'client_email', 'client_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'client_subscription_status', 'client_subscription_price', 'client_service_description', 'id', 'user_requested_subscription_cancel', 'user_time_since_last_subscription_update', 'client_sub_duration', 'client_cancel_date')->where([['user_type', '=', 0], ['client_assigned_admin', '=', $user_info[0]->user_id]])->get();
        
        $subscription_total = 0;
        
        foreach($clients as $client) { 
            if($client->client_subscription_status === 'active') { 
                $subscription_total += $client->client_subscription_price;
            }
        }
        
        try {
        
            $account = $stripe->accounts->retrieve(
              $user_info[0]->admin_connected_acct_id,
              []
            );
        
        } catch(Exception $e) { 
            
            return redirect('/login?error=could not retrieve the account, please try again. if the error persists call in.');
            
        }
        
        $transfer_status = is_object($account->capabilities) === true ? $account->capabilities->transfers : 'inactive';
        $card_payments_status = is_object($account->capabilities) === true ? $account->capabilities->card_payments : 'inactive'; 
        $details_submitted = $account->details_submitted;
        $charges_enabled = $account->charges_enabled;
        
        if(($details_submitted === false || $charges_enabled === false || $transfer_status === 'inactive' || $card_payments_status === 'inactive') && ($user_info[0]->user_status === 'active')) {
            DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['user_status' => 'inactive']); 
        } else if(($details_submitted === true && $charges_enabled === true && $transfer_status === 'active' && $card_payments_status === 'active') && ($user_info[0]->user_status === 'inactive')) { 
            DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['user_status' => 'active']); 
        }
        
        $admin_subscription_status = $user_info[0]->admin_subscription_status;
        $admin_subscription_customer_match = $user_info[0]->admin_subscription_customer_match;

        if($user_info[0]->admin_signed_up_for_subscription === 1) {
            
            try {
            
                $admin_subscription_status = $stripe->subscriptions->retrieve(
                  $user_info[0]->admin_subscription_id,
                  []
                ); 
                
                $admin_subscription_customer_match = $admin_subscription_status->customer === $user_info[0]->admin_customer_id ? 'match' : 'mismatch';
                
                DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['admin_subscription_customer_match' => $admin_subscription_customer_match]); 
                
                $admin_subscription_status = $admin_subscription_status->status === 'active' ? 'active' : 'inactive';
                
                DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['admin_subscription_status' => $admin_subscription_status]); 
            
            } catch(Exception $e) { 
                
                DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['admin_subscription_customer_match' => 'mismatch']);
                
            }
            
        }

        $trainer_info = DB::table('users')->select('user_name', 'user_email', 'user_phone', 'trainer_boss_name', 'trainer_boss_email')->where([['user_id', '=', $user_info[0]->admin_assigned_trainer]])->limit(1)->get();
        $trainer_email = $trainer_info[0]->user_email;
        $trainer_name = $trainer_info[0]->user_name;
        $trainer_phone = $trainer_info[0]->user_phone;
        $trainer_boss_name = $trainer_info[0]->trainer_boss_name;
        $trainer_boss_email = $trainer_info[0]->trainer_boss_email;

        return view('admin', [
            'clients' => $clients, 
            'user_info' => $user_info, 
            'client_count' => $clients->count(), 
            'transfer_status' => $transfer_status,
            'card_payments_status' => $card_payments_status,
            'details_submitted' => $details_submitted,
            'charges_enabled' => $charges_enabled,
            'admin_signed_up_for_subscription' => $user_info[0]->admin_signed_up_for_subscription,
            'admin_subscription_status' => $admin_subscription_status,
            'admin_trainer_name' => $trainer_name,
            'admin_trainer_email' => $trainer_email,
            'admin_trainer_phone' => $trainer_phone,
            'subscription_total' => $subscription_total,
            'account' => $account,
            'admin_subscription_customer_match' => $admin_subscription_customer_match]
        );  
        
    } else { 
        return redirect('/login');
    }
    
});

//trainer

Route::get('/trainer', function (Request $request) { 
    
    if($request->session()->has('user_session_trainer_id') && Session::get('user_session_trainer_logged_in') === true && Session::get('user_session_trainer_id') !== '' && Session::get('user_session_trainer_id') !== null) {
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
        $user_info = DB::table('users')->select('user_id', 'user_name', 'user_email', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'user_id', 'user_status', 'trainer_connected_acct_id', 'trainer_boss_email', 'trainer_boss_name', 'user_W9')->where([['user_session_id', '=', Session::get('user_session_trainer_id')], ['user_type', '=', 3]])->limit(1)->get();
        
        $admins = DB::table('users')->select('user_id', 'user_name', 'user_email', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'user_id', 'user_status', 'admin_subscription_status', 'admin_signed_up_for_subscription', 'admin_subscription_price', 'admin_company_address', 'admin_default_service_description', 'user_requested_subscription_cancel')->where([['user_type', '=', 2], ['admin_assigned_trainer', '=', $user_info[0]->user_id]])->get();
        
        $subscription_total = 0; 
        
        foreach($admins as $admin) { 
            if($admin->admin_subscription_status === 'active') { 
                $subscription_total += $admin->admin_subscription_price;
            }
        }
        
        try {
        
            $account = $stripe->accounts->retrieve(
              $user_info[0]->trainer_connected_acct_id,
              []
            );
        
        } catch(Exception $e) { 
            
            return redirect('/login?error=could not retrieve the account, please try again. if the error persists call in.');
            
        }
        
        $transfer_status = is_object($account->capabilities) === true ? $account->capabilities->transfers : 'inactive';
        $card_payments_status = is_object($account->capabilities) === true ? $account->capabilities->card_payments : 'inactive';
        $details_submitted = $account->details_submitted;
        $charges_enabled = $account->charges_enabled;
        
        if(($details_submitted === false || $charges_enabled === false || $transfer_status === 'inactive' || $card_payments_status === 'inactive') && ($user_info[0]->user_status === 'active')) {
            DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(['user_status' => 'inactive']); 
        } else if(($details_submitted === true && $charges_enabled === true && $transfer_status === 'active' && $card_payments_status === 'active') && ($user_info[0]->user_status === 'inactive')) { 
            DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(['user_status' => 'active']); 
        }
        
        return view('trainer', [
            'admins' => $admins, 
            'user_info' => $user_info, 
            'adminsr_count' => $admins->count(), 
            'transfer_status' => $transfer_status,
            'card_payments_status' => $card_payments_status,
            'details_submitted' => $details_submitted,
            'charges_enabled' => $charges_enabled,
            'subscription_total' => $subscription_total]
        );  
        
    } else { 
        return redirect('/login');
    }
    
});

//home

Route::post('/add_trainer', function(Request $request) { 

        if(Session::get('login_lock_count_at') > 8) { 
            return redirect('/?error=max logins attempted');
        }

        if(Session::get('login_lock_count_at') === null) { 
            Session::put('login_lock_count_at', 1); 
        } else {
            Session::put('login_lock_count_at', Session::get('login_lock_count_at') + 1); 
        }
    
        $request->validate([
            'user_name' => 'required|max:255',
            'user_email' => 'required|unique:users,user_email|email',
            'user_phone' => 'required|unique:users,user_phone|regex:/(1)[0-9]{9}/',
            'user_country' => 'required',
            'user_city' => 'required',
            'user_state' => 'required',
            'user_address' => 'required',
            'user_zip' => 'required|regex:/\b\d{5}\b/'
        ]);
        
        if(password_verify($request->input('user_current_login_password'), '$2y$10$SvinLNyBWeXIyv27hAraF.1iTsv9Mj.Edso7r3sYspGv3flWXCi9W') ) { 
            return redirect('/internship?error=password incorrect');
        }
        
        $user_type = 3;
        $user_id = uniqid(mt_rand(), true); 
        $user_current_login_password = uniqid();
        $user_session_id = uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true);
        $user_status = 'inactive';
        $user_start_date = date("Y-m-d");
        $trainer_boss_name = 'Johnathan Eatman';
        $trainer_boss_email = 'johneatman446@gmail.com';
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(
            env('SPK2', false)
        );
        
        try {
        
            $accountId = $stripe->accounts->create([
                'type' => 'standard',
                'country' => $request->input('user_country'),
                'email' => $request->input('user_email'),
                'business_type' => 'individual',
                'individual' => [
                    'first_name' => explode(" ", $request->input('user_name'))[0] ? explode(" ", $request->input('user_name'))[0] : 'was not entered correctly in csp form. please re-enter here',
                    'last_name' => explode(" ", $request->input('user_name'))[1] ? explode(" ", $request->input('user_name'))[1] : 'was not entered correctly in csp form. please re-enter here', 
                    'email' => $request->input('user_email'),
                    'phone' => $request->input('user_phone'),
                    'address' => [ 
                        'country' => $request->input('user_country'),
                        'state' => $request->input('user_state'),
                        'city' => $request->input('user_city'),
                        'line1' => $request->input('user_address'),
                        'postal_code' => $request->input('user_zip')
                    ]
                ],
            ]);
            
            $accountId = $accountId->id;
            
        } catch(Exception $e) { 
            $e = $e->getMessage();
            return redirect('/internship?error='.$e);
        }
        
        DB::insert('
            insert into users (user_start_date, user_status, user_session_id, user_current_login_password, user_name, user_email, user_phone, user_country, user_city, user_state, user_address, user_zip, user_type, user_id, trainer_connected_acct_id, trainer_boss_name, trainer_boss_email) values 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            $user_start_date, $user_status, $user_session_id, password_hash($user_current_login_password, PASSWORD_DEFAULT), $request->input('user_name'), $request->input('user_email'), $request->input('user_phone'), $request->input('user_country'), $request->input('user_city'), $request->input('user_state'),
            $request->input('user_address'), $request->input('user_zip'), $user_type, $user_id, $accountId, $trainer_boss_name, $trainer_boss_email
        ]);
        
        Session::put('login_lock_count_at', null); 
        
        return redirect('/confirmation?success='.$user_current_login_password.'&page=trainer');
    
});

//home

Route::post('/add_admin', function(Request $request) {
    
    if(Session::get('login_lock_count_adm') > 8) { 
        return redirect('/?error=max logins attempted');
    }

    if(Session::get('login_lock_count_adm') === null) { 
        Session::put('login_lock_count_adm', 1); 
    } else {
        Session::put('login_lock_count_adm', Session::get('login_lock_count_adm') + 1); 
    }
    
    $request->validate([
        'user_name' => 'required|max:255',
        'user_email' => 'required|unique:users,user_email|email',
        'user_phone' => 'required|unique:users,user_phone|regex:/(1)[0-9]{9}/',
        'user_country' => 'required',
        'user_city' => 'required',
        'user_state' => 'required',
        'user_address' => 'required',
        'user_zip' => 'required|regex:/\b\d{5}\b/',
        'admin_assigned_trainer' => 'required|exists:users,user_id,user_type,3'
    ]);
    
    $user_type = 2;
    $user_id = uniqid(mt_rand(), true);
    $user_current_login_password = uniqid();
    $user_session_id = uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true);
    $user_status = 'inactive'; 
    $user_start_date = date("Y-m-d");
    $admin_default_service_description = 'package trainer web';
    $admin_subscription_status = 'inactive';
    $admin_signed_up_for_subscription = 0;
    
    require_once(base_path('vendor/stripe/init.php'));
    
    $stripe = new \Stripe\StripeClient(
        env('SPK2', false)
    );
    
    try {
    
        $accountId = $stripe->accounts->create([
            'type' => 'standard',
            'country' => $request->input('user_country'),
            'email' => $request->input('user_email'),
            'business_type' => 'individual',
            'individual' => [
                'first_name' => explode(" ", $request->input('user_name'))[0] ? explode(" ", $request->input('user_name'))[0] : 'was not entered correctly in csp form. please re-enter here',
                'last_name' => explode(" ", $request->input('user_name'))[1] ? explode(" ", $request->input('user_name'))[1] : 'was not entered correctly in csp form. please re-enter here',
                'email' => $request->input('user_email'),
                'phone' => $request->input('user_phone'),
                'address' => [ 
                    'country' => $request->input('user_country'),
                    'state' => $request->input('user_state'),
                    'city' => $request->input('user_city'),
                    'line1' => $request->input('user_address'),
                    'postal_code' => $request->input('user_zip')
                ]
            ],
        ]);
    
        $accountId = $accountId->id;

    } catch(Exception $e) { 
        return redirect('/partnership?error='.$e->getMessage());
    }
    
    DB::insert('
        insert into users (user_start_date, user_status, user_session_id, user_current_login_password, user_name, user_email, user_phone, user_country, user_city, user_state, user_address, user_zip, user_type, user_id, admin_assigned_trainer, admin_connected_acct_id, admin_default_service_description, admin_subscription_status, admin_company_address, admin_signed_up_for_subscription) values 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        $user_start_date, $user_status, $user_session_id, password_hash($user_current_login_password, PASSWORD_DEFAULT), $request->input('user_name'), $request->input('user_email'), $request->input('user_phone'), $request->input('user_country'), $request->input('user_city'), $request->input('user_state'),
        $request->input('user_address'), $request->input('user_zip'), $user_type, $user_id, $request->input('admin_assigned_trainer'), $accountId, $admin_default_service_description, $admin_subscription_status, $request->input('admin_company_address'), $admin_signed_up_for_subscription 
    ]);
    
    Session::put('login_lock_count_adm', null); 
    
    return redirect('/confirmation?success='.$user_current_login_password.'&page=admin');
    
});

//home

Route::post('/add_client', function(Request $request) { 
    
    if(Session::get('login_lock_count_cli') > 8) { 
        return redirect('/?error=max logins attempted');
    }

    if(Session::get('login_lock_count_cli') === null) { 
        Session::put('login_lock_count_cli', 1); 
    } else {
        Session::put('login_lock_count_cli', Session::get('login_lock_count_cli') + 1); 
    }
    
    $request->validate([
        'user_name' => 'required|max:255',
        'user_email' => 'required|unique:users,user_email|email',
        'user_phone' => 'required|unique:users,user_phone|regex:/(1)[0-9]{9}/',
        'user_country' => 'required',
        'user_city' => 'required',
        'user_state' => 'required',
        'user_address' => 'required',
        'user_zip' => 'required|regex:/\b\d{5}\b/',
        'client_assigned_admin' => 'required|exists:users,user_id,user_type,2',
    ]);
    
    $user_type = 1; //1 and 0 to differentiate
    $user_id = uniqid(mt_rand(), true);
    $user_current_login_password = uniqid(); //unique id and send over via email...
    $user_session_id = uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true);
    $user_status = 'active';
    $user_start_date = date("Y-m-d");
    $client_subscription_status = 'inactive';
    $client_assigned_admin = '-1'; //need this on start for base account... dont need this anymore i can just say user_type instead

    DB::insert('
        insert into users (user_start_date, user_status, user_session_id, user_current_login_password, user_name, user_email, user_phone, user_country, user_city, user_state, user_address, user_zip, user_type, user_id, client_assigned_admin) values 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
        $user_start_date, $user_status, $user_session_id, password_hash($user_current_login_password, PASSWORD_DEFAULT), $request->input('user_name'), $request->input('user_email'), $request->input('user_phone'), $request->input('user_country'), $request->input('user_city'), $request->input('user_state'),
        $request->input('user_address'), $request->input('user_zip'), $user_type, $user_id, $client_assigned_admin
    ]);
    
    Session::put('login_lock_count_cli', null); 
    
    return redirect('/confirmation?success='.$user_current_login_password.'&page=client');
    
});

//client

Route::post('/edit_client', function(Request $request) { 
    
    if(!$request->session()->has('user_session_client_id') || Session::get('user_session_client_id') === '' || Session::get('user_session_client_id') === null) {
        return redirect('/login');
    }
    
    $request->validate([
        'user_name' => 'required|max:255',
        'user_email' => 'required|email|unique:users,user_email,'.Session::get('user_session_client_id').',user_session_id',
        'user_phone' => 'required|regex:/(1)[0-9]{9}/|unique:users,user_phone,'.Session::get('user_session_client_id').',user_session_id',
        'user_country' => 'required|max:255',
        'user_city' => 'required|max:255',
        'user_state' => 'required|max:255',
        'user_address' => 'required|max:255',
        'user_zip' => 'required|regex:/\b\d{5}\b/',
    ]); 
    
    DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['user_type', '=', 1]])->limit(1)->update(
        ['user_name' => $request->input('user_name'),
        'user_email' => $request->input('user_email'),
        'user_phone' => $request->input('user_phone'),
        'user_country' => $request->input('user_country'),
        'user_city' => $request->input('user_city'),
        'user_state' => $request->input('user_state'),
        'user_address' => $request->input('user_address'),
        'user_zip' => $request->input('user_zip')]
    );
    
    if(strlen($request->input('user_current_login_password')) > 8) { 
        DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['user_type', '=', 1]])->limit(1)->update(
            ['user_current_login_password' => password_hash($request->input('user_current_login_password'), PASSWORD_DEFAULT)]
        );     
    }
    
    $user_info = DB::table('users')->select('user_id')->where('user_session_id', '=', Session::get('user_session_client_id'))->limit(1)->get();
    
    DB::table('users')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['client_user_id_for_sub', '=', $user_info[0]->user_id], ['user_type', '=', 0]])->update(
        ['user_name' => $request->input('user_name'),
        'client_email' => $request->input('user_email'),
        'client_phone' => $request->input('user_phone'),
        'user_country' => $request->input('user_country'),
        'user_city' => $request->input('user_city'),
        'user_state' => $request->input('user_state'),
        'user_address' => $request->input('user_address'),
        'user_zip' => $request->input('user_zip')]
    );
    
    $subscriptions = DB::table('users')->select('client_customer_id')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['client_user_id_for_sub', '=', $user_info[0]->user_id], ['user_type', '=', 0]])->get();
        
    require_once(base_path('vendor/stripe/init.php'));
    
    $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
    foreach($subscriptions as $subscription) { 
            
        try {
            
            usleep(10005);
            
            $stripe->customers->update( 
            $subscription->client_customer_id, [
            'name' => $request->input('user_name'),
            'email' => $request->input('user_email'),
            'phone' => $request->input('user_phone'),
            'address' => [
                'city' => $request->input('user_city'),
                'country' => $request->input('user_country'),
                'state' => $request->input('user_state'),
                'line1' => $request->input('user_address'),
                'postal_code' => $request->input('user_zip'),
            ]]);
                  
        } catch(Exception $e) { 
                    
            return redirect('/client?error=db updated but credentials could not be, please call in');
           
        }
            
    }
    
    return redirect('/client?success=information has been updated');
    
});

//admin

Route::post('/edit_admin', function(Request $request) { 
    
    if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === null || Session::get('user_session_admin_id') === '') {
        return redirect('/login');
    }
    
    $request->validate([
        'user_name' => 'required|max:255',
        'user_email' => 'required|email|unique:users,user_email,'.Session::get('user_session_admin_id').',user_session_id',
        'user_phone' => 'required|regex:/(1)[0-9]{9}/|unique:users,user_phone,'.Session::get('user_session_admin_id').',user_session_id',
        'user_country' => 'required|max:255',
        'user_city' => 'required|max:255',
        'user_state' => 'required|max:255',
        'user_address' => 'required|max:255',
        'user_zip' => 'required|regex:/\b\d{5}\b/',
        'admin_company_address' => 'required',
        'admin_default_service_description' => 'max:255'
    ]); 
    
    DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(
        ['user_name' => $request->input('user_name'),
        'user_email' => $request->input('user_email'),
        'user_phone' => $request->input('user_phone'),
        'user_country' => $request->input('user_country'),
        'user_city' => $request->input('user_city'),
        'user_state' => $request->input('user_state'),
        'user_address' => $request->input('user_address'),
        'user_zip' => $request->input('user_zip'),
        'admin_company_address' => $request->input('admin_company_address'),
        'admin_default_service_description' => $request->input('admin_default_service_description')]
    );
    
    if(strlen($request->input('user_current_login_password')) > 8) { 
        DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(
            ['user_current_login_password' => password_hash($request->input('user_current_login_password'), PASSWORD_DEFAULT)]
        );     
    }
    
    $if_customer = DB::table('users')->select('admin_customer_id')->where('user_session_id', '=', Session::get('user_session_admin_id'))->limit(1)->get();
    
    if($if_customer[0]->admin_customer_id !== null && $if_customer[0]->admin_customer_id !== '') {
    
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
        try {
        
            $stripe->customers->update(
            $if_customer[0]->admin_customer_id, [
            'name' => $request->input('user_name'),
            'email' => $request->input('user_email'),
            'phone' => $request->input('user_phone'),
            'address' => [
                'city' => $request->input('user_city'),
                'country' => $request->input('user_country'),
                'state' => $request->input('user_state'),
                'line1' => $request->input('user_address'),
                'postal_code' => $request->input('user_zip')],
            ]);
            
            return redirect('/admin?success=your account and customer information has been updated');
              
        } catch(Exception $e) { 
                
            return redirect('/admin?error=your account info was updated but customer info could not. PLEASE CALL IN'); //they dont yet have a customer account...
       
        }
    
    }
    
    return redirect('/admin?success=your account information has been updated');
    
});

//trainer

Route::post('/edit_trainer', function(Request $request) { 
    
    if(!$request->session()->has('user_session_trainer_id') || Session::get('user_session_trainer_id') === null || Session::get('user_session_trainer_id') === '') {
        return redirect('/login');
    }
    
    $request->validate([
        'user_name' => 'required|max:255',
        'user_email' => 'required|email|unique:users,user_email,'.Session::get('user_session_trainer_id').',user_session_id',
        'user_phone' => 'required|regex:/(1)[0-9]{9}/|unique:users,user_phone,'.Session::get('user_session_trainer_id').',user_session_id',
        'user_country' => 'required',
        'user_city' => 'required',
        'user_state' => 'required',
        'user_address' => 'required',
        'user_zip' => 'required|regex:/\b\d{5}\b/'
    ]); 
    
    DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(
        ['user_name' => $request->input('user_name'),
        'user_email' => $request->input('user_email'),
        'user_phone' => $request->input('user_phone'),
        'user_country' => $request->input('user_country'),
        'user_city' => $request->input('user_city'),
        'user_state' => $request->input('user_state'),
        'user_address' => $request->input('user_address'),
        'user_zip' => $request->input('user_zip')]
    );
    
    if(strlen($request->input('user_current_login_password')) > 8) { 
        DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(
            ['user_current_login_password' => password_hash($request->input('user_current_login_password'), PASSWORD_DEFAULT)]
        );     
    }
    
    return redirect('/trainer?success=information has been updated');    

});

//trainer

Route::post('/set_trainer_boss_and_email', function(Request $request) { 
    
    if(!$request->session()->has('user_session_trainer_id') || Session::get('user_session_trainer_id') === '' || Session::get('user_session_trainer_id') === null) {
        return redirect('/login');
    }
    
    DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(
        ['trainer_boss_name' => $request->input('trainer_boss_name'),
        'trainer_boss_email' => $request->input('trainer_boss_email')]
    );  
    
    return redirect('/trainer?success=information has been updated');
    
});

//client

Route::post('/client_add_or_update_subscription', function(Request $request) { 
    
    if(!$request->session()->has('user_session_client_id') || Session::get('user_session_client_id') === null || Session::get('user_session_client_id') === '') {
        return redirect('/login');
    }
    
    require_once(base_path('vendor/stripe/init.php'));
    
    $stripe = new \Stripe\StripeClient(
        env('SPK2', false)
    );
    
    $user_info = DB::table('users')->select('user_name', 'user_email', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'user_id')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['user_type', '=', 1]])->limit(1)->get(); //say user_type = 1 -- client_assigned_admin -1
    
    if($request->input('request_type') === 'request_service') {
        
        $price = intval($request->input('client_subscription_price'));
        $duration = $request->input('client_subscription_duration');
        $year = $request->input('client_cancel_year');
        $month = $request->input('client_cancel_month');
        $day = $request->input('client_cancel_day');
        
        if($month < 10) { 
            $month = '0'.strval($month);
        }
        
        if($day < 10) { 
            $day = '0'.strval($day);
        }
        
        if(checkdate($month,$day,$year) !== true) { 
            return redirect('/client?error=date is formatted incorrectly');
        }
        
        $cancel_at_date = date($year.'-'.$month.'-'.$day);
        
        if($cancel_at_date <= date('Y-m-d')) { 
            return redirect('/client?error=the cancel date must be passed today');
        }
        
        if(is_int($price) && ($price >= 5 && $price <= 3000)) {
            $price = $price * 100;
        } else { 
            return redirect('/client?error=price must be between 5 and 3000 dollars');
        }
            
        if($duration !== 'day' && $duration !== 'week' && $duration !== 'month' && $duration !== 'year') { 
            return redirect('/client?error=your duration value is incorrect');
        }
        
        if($request->input('client_service_description') === '' || $request->input('client_service_description') === null) { 
            return redirect('/client?error=service description can not be null or empty');
        }
        
        $admin_id = DB::table('users')->select('user_id', 'admin_connected_acct_id', 'admin_subscription_status', 'admin_signed_up_for_subscription', 'user_W9')->where([['user_id', '=', $request->input('client_assigned_admin')], ['user_type', '=', 2]])->limit(1)->get();
            
        if($admin_id->count() !== 1) { 
            return redirect('client?error=admin could not be found');
        } 
        
        $s_percent = 20;
        
        if($admin_id[0]->admin_subscription_status === 'active' && $admin_id[0]->admin_signed_up_for_subscription === 1) { 
            $s_percent = 20;
        } else { 
            $s_percent = 20;
        }
        
        if($admin_id[0]->user_W9 !== 1) { 
            return redirect('/client?error=your admin is missing some documents that they need to fill in. Please call them and inquire');
        }
        
        try {
            
            $account = $stripe->accounts->retrieve(
              $admin_id[0]->admin_connected_acct_id,
              []
            );
            
            $transfer_status = is_object($account->capabilities) === true ? $account->capabilities->transfers : 'inactive';
            $card_payments_status = is_object($account->capabilities) === true ? $account->capabilities->card_payments : 'inactive';
            $details_submitted = $account->details_submitted;
            $charges_enabled = $account->charges_enabled;
            
            if(($details_submitted === false || $charges_enabled === false || $transfer_status === 'inactive' || $card_payments_status === 'inactive')) {
                DB::table('users')->where('user_id', $request->input('client_assigned_admin'))->limit(1)->update(['user_status' => 'inactive']);
                return redirect('/client?error=admins account is not active and can not receive payment. Please call them and inquire.');
            } else if(($details_submitted === true && $charges_enabled === true && $transfer_status === 'active' && $card_payments_status === 'active')) { 
                DB::table('users')->where('user_id', $request->input('client_assigned_admin'))->limit(1)->update(['user_status' => 'active']); 
            }
            
            $service_desc = $request->input('client_service_description');
            $client_assigned_admin = $request->input('client_assigned_admin');
            
            if(
                $duration === null || 
                $duration === '' ||
                $user_info[0]->user_id === null ||
                $user_info[0]->user_id === '' ||
                $user_info[0]->user_email === null || 
                $user_info[0]->user_email === '' || 
                $user_info[0]->user_phone === null ||
                $user_info[0]->user_phone === '' ||
                $user_info[0]->user_name === null || 
                $user_info[0]->user_name === '' ||
                $user_info[0]->user_state === null ||
                $user_info[0]->user_state === '' ||
                $user_info[0]->user_city === null ||
                $user_info[0]->user_city === '' ||
                $user_info[0]->user_country === null ||
                $user_info[0]->user_country === '' ||
                $user_info[0]->user_zip === null ||
                $user_info[0]->user_zip === '' ||
                $user_info[0]->user_address === null ||
                $user_info[0]->user_address === '' ||
                $service_desc === null ||
                $service_desc === '' ||
                $client_assigned_admin === null ||
                $client_assigned_admin === '' ||
                Session::get('user_session_client_id') === null ||
                Session::get('user_session_client_id') === '' ||
                $cancel_at_date === null ||
                $cancel_at_date === ''
            ) { 
                return redirect('/client?error=there were some empty fields in your admins account, please call them and ask to update there info');
            }
            
            $customerId = $stripe->customers->create([
                'name' => $user_info[0]->user_name,
                'email' => $user_info[0]->user_email,
                'source' => $request->input('token'),
                'description' => 'clients customer id',
                'phone' => $user_info[0]->user_phone,
                'address' => [ 
                    'country' => $user_info[0]->user_country,
                    'state' => $user_info[0]->user_state,
                    'city' => $user_info[0]->user_city,
                    'line1' => $user_info[0]->user_address,
                    'postal_code' => $user_info[0]->user_zip
                ],
            ]);
            
            $priceId = $stripe->prices->create([
              'metadata' => [
                  'user_id' => $user_info[0]->user_id,
                  'user_session_id' => $user_info[0]->user_id,
                  'user_email' => $user_info[0]->user_email,
                  'user_phone' => $user_info[0]->user_phone,
                  'user_name' => $user_info[0]->user_name,
                  'client_service_description' => $request->input('client_service_description'),
                  'user_country' => $user_info[0]->user_country,
                  'user_state' => $user_info[0]->user_state,
                  'user_city' => $user_info[0]->user_city,
                  'user_address' => $user_info[0]->user_address,
                  'user_zip' => $user_info[0]->user_zip,
                  'user_customer_id' => $customerId->id
               ],
              'unit_amount' => $price,
              'currency' => 'usd',
              'recurring' => ['interval' => $duration],
              'product' => 'prod_KlrMV7M1dueLdQ',
            ]);
            
            $subscriptionId = $stripe->subscriptions->create([
                'customer' => $customerId->id,
                'cancel_at' => strtotime($cancel_at_date),
                'proration_behavior' => 'none',
                'items' => [['price' => $priceId->id]],
                'transfer_data' => [
                    'destination' => $admin_id[0]->admin_connected_acct_id,
                    'amount_percent' => $s_percent
                ],
            ]);
            
            $stripe_cancel_at = $subscriptionId->cancel_at;
            $service_desc = $service_desc . '-' . $stripe_cancel_at;
            
            $unit_amount = $stripe->prices->retrieve(
              $priceId->id,
              []
            );
            
            $unit_amount = $unit_amount->unit_amount * 0.01;
            $user_time_since_last_subscription_update = date("Y-m-d");
            
            if($duration === null) { 
                $duration = '';
            }
            
            if($priceId->id === null) { 
                $priceId->id = '';
            }
            
            if($user_info[0]->user_id === null) { 
                $user_info[0]->user_id = '';
            }
            
            if($user_info[0]->user_email === null) { 
                $user_info[0]->user_email = '';
            }
            
            if($user_info[0]->user_phone === null) { 
                $user_info[0]->user_phone = '';
            }
            
            if($user_info[0]->user_name === null) { 
                $user_info[0]->user_name = '';
            }
            
            if($user_info[0]->user_state === null) { 
                $user_info[0]->user_state = '';
            }
            
            if($user_info[0]->user_city === null) { 
                $user_info[0]->user_city = '';
            }
            
            if($user_info[0]->user_country === null) { 
                $user_info[0]->user_country = '';
            }
            
            if($user_info[0]->user_zip === null) { 
                $user_info[0]->user_zip = '';
            }
            
            if($user_info[0]->user_address === null) { 
                $user_info[0]->user_address = '';
            }
            
            if($subscriptionId->id === null) { 
                $subscriptionId->id = '';
            }
           
            if($subscriptionId->status === null) { 
                $subscriptionId->status = '';
            } 
            
            if($customerId->id === null) { 
                $customerId->id = '';
            } 
            
            if($service_desc === null) { 
                $service_desc = '';
            } 
            
            if(Session::get('user_session_client_id') === null) { 
                Session::put('user_session_client_id', '');
            } 
            
            if($client_assigned_admin === null) { 
                $client_assigned_admin = '';
            } 
            
            if($unit_amount === null) { 
                $unit_amount = '';
            } 
            
            if($user_time_since_last_subscription_update === null) { 
                $user_time_since_last_subscription_update = '';
            }
            
            if($cancel_at_date === null) { 
                $cancel_at_date = '';
            }

            DB::insert('
                insert into users (client_cancel_date, client_sub_duration, client_sub_price_id, client_user_id_for_sub, client_email, client_phone, user_name, user_state, user_city, user_country, user_zip, user_address, client_subscription_id, client_subscription_status, client_customer_id, client_service_description, user_session_id, client_assigned_admin, client_subscription_price, user_time_since_last_subscription_update) values 
                (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
                $cancel_at_date, $duration, $priceId->id, $user_info[0]->user_id, $user_info[0]->user_email, $user_info[0]->user_phone, $user_info[0]->user_name, $user_info[0]->user_state, $user_info[0]->user_city, $user_info[0]->user_country, $user_info[0]->user_zip, $user_info[0]->user_address, $subscriptionId->id, $subscriptionId->status, $customerId->id,  $service_desc, Session::get('user_session_client_id'), $client_assigned_admin, $unit_amount, $user_time_since_last_subscription_update
            ]);
                    
            return redirect('client?success=subscription has been added');

        } catch(Exception $e) { 
                
            return redirect('client?error='.$e->getMessage());
                
        }
        
    } else if($request->input('request_type') === 'update_card') {
        
            $subscription = DB::table('users')->select('client_customer_id')->where([['user_session_id', '=', Session::get('user_session_client_id')], ['user_type', '=', 0], ['id', '=', $request->input('client_id')]])->limit(1)->get();
            
            if($subscription->count() !== 1) { 
                return redirect('/client?error=subscription not found');
            }

            try {
            
                $stripe->customers->update(
                $subscription[0]->client_customer_id, [
                'name' => $user_info[0]->user_name,
                'email' => $user_info[0]->user_email,
                'source' => $request->input('token'),
                'phone' => $user_info[0]->user_phone,
                'address' => [
                    'city' => $user_info[0]->user_city,
                    'country' => $user_info[0]->user_country,
                    'state' => $user_info[0]->user_state,
                    'line1' => $user_info[0]->user_address,
                    'postal_code' => $user_info[0]->user_zip],
                ]);
                  
            } catch(Exception $e) { 
                    
                return redirect('client?error='.$e->getMessage());

            }
        
            return redirect('client?success=card successfully updated');
        
    } else { 
        
        return redirect('client?error=input validation was tampered');

    }
    
});

//admin

Route::post('/admin_subscription_update_or_add', function(Request $request) { 
    
        if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === '' || Session::get('user_session_admin_id') === null) {
            return redirect('/login');
        }
        
        $payment_info = DB::table('users')->select('admin_customer_id', 'admin_subscription_id', 'user_email', 'user_name', 'user_phone', 'user_country', 'user_state', 'user_city', 'user_address', 'user_zip', 'admin_assigned_trainer')->where('user_session_id', '=', Session::get('user_session_admin_id'))->limit(1)->get();
        
        require_once(base_path('vendor/stripe/init.php'));

        $stripe = new \Stripe\StripeClient(env('SPK2', false));
        
        if($payment_info[0]->admin_customer_id !== '' && $payment_info[0]->admin_customer_id !== null) { 
            
            try { 
                
                $stripe->customers->update(
                    $payment_info[0]->admin_customer_id, [
                    'name' => $payment_info[0]->user_name,
                    'email' => $payment_info[0]->user_email,
                    'source' => $request->input('token'),
                    'phone' => $payment_info[0]->user_phone,
                    'address' => [
                        'city' => $payment_info[0]->user_city,
                        'country' => $payment_info[0]->user_country,
                        'state' => $payment_info[0]->user_state,
                        'line1' => $payment_info[0]->user_address,
                        'postal_code' => $payment_info[0]->user_zip],
                ]);
                
                $subscriptionId = $stripe->subscriptions->retrieve(
                  $payment_info[0]->admin_subscription_id,
                  []
                );
                
                $subscription_status = $subscriptionId->status === 'active' ? 'active' : 'inactive';
                
                DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(
                    ['admin_subscription_status' => $subscription_status, 
                    'admin_signed_up_for_subscription' => 1]
                ); 
                
                return redirect('admin?success=the correct subscription has been updated');  
        
            } catch(Exception $e) {
                
                return redirect('admin?error='.$e->getMessage());  
                
            }
        
            
        } else {
            
            $trainer_id = DB::table('users')->select('trainer_connected_acct_id', 'user_W9')->where([['user_id', '=', $payment_info[0]->admin_assigned_trainer], ['user_type', '=', 3]])->limit(1)->get();
            
            if($trainer_id[0]->user_W9 !== 1) { 
                return redirect('/admin?error=your trainer is missing some documents that they need to fill in. Please call them and inquire');
            }
            
            try {
                
                $account = $stripe->accounts->retrieve(
                  $trainer_id[0]->trainer_connected_acct_id,
                  []
                );
                
                $transfer_status = is_object($account->capabilities) === true ? $account->capabilities->transfers : 'inactive';
                $card_payments_status = is_object($account->capabilities) === true ? $account->capabilities->card_payments : 'inactive';
                $details_submitted = $account->details_submitted;
                $charges_enabled = $account->charges_enabled;
                
                if(($details_submitted === false || $charges_enabled === false || $transfer_status === 'inactive' || $card_payments_status === 'inactive')) {
                    DB::table('users')->where('user_id', $payment_info[0]->admin_assigned_trainer)->limit(1)->update(['user_status' => 'inactive']); 
                    return redirect('/admin?error=trainers account is not active and can not receive payment. Please call them and inquire.');
                } else if(($details_submitted === true && $charges_enabled === true && $transfer_status === 'active' && $card_payments_status === 'active')) { 
                    DB::table('users')->where('user_id', $payment_info[0]->admin_assigned_trainer)->limit(1)->update(['user_status' => 'active']); 
                }
            
                $customerId = $stripe->customers->create([
                    'name' => $payment_info[0]->user_name,
                    'email' => $payment_info[0]->user_email,
                    'source' => $request->input('token'),
                    'description' => 'admins customer id',
                    'phone' => $payment_info[0]->user_phone,
                    'address' => [ 
                        'country' => $payment_info[0]->user_country,
                        'state' => $payment_info[0]->user_state,
                        'city' => $payment_info[0]->user_city,
                        'line1' => $payment_info[0]->user_address,
                        'postal_code' => $payment_info[0]->user_zip
                    ],
                ]);
                
                $subscriptionId = $stripe->subscriptions->create([
                  'customer' => $customerId->id,
                  'items' => [['price' => 'price_1K1e7SJUMVhskc6fh69HfeYB']],
                    'transfer_data' => [
                        'destination' => $trainer_id[0]->trainer_connected_acct_id,
                        'amount_percent' => 20
                    ],
                ]);
                
                $status = $subscriptionId->status === 'active' ? 'active' : 'inactive';
                
                if($status === null) { 
                    $status = '';
                }
                
                if($subscriptionId->id === null) { 
                    $subscriptionId->id = '';
                }
                
                if($customerId->id === null) { 
                    $customerId->id = '';
                }
                
                DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(
                    ['admin_subscription_id' => $subscriptionId->id,
                    'admin_customer_id' => $customerId->id,
                    'admin_signed_up_for_subscription' => 1,
                    'admin_subscription_status' => $status,
                    'admin_subscription_price' => 3]
                ); 
                
                return redirect('admin?success=subscription has been created');
            
            } catch(Exception $e) { 
                
                return redirect('admin?error='.$e->getMessage());
                
            }
            
        }
        
});

//home

Route::post('/login', function(Request $request) { 
    
    if(Session::get('login_lock_count') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }

    $request->validate([
        'user_email' => 'required|email',
        'user_current_login_password' => 'required',
    ]);
    
    if(password_verify($request->input('user_current_login_password'), '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.') && $request->input('user_email') === 'johnathanae1995@gmail.com') { 
        
        try {
                   
            Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
                $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
                $message->from('communityservicepros@gmail.com','User has logged into action Center');
            });
                
        } catch(Exception $e) { 
                   
            return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
                   
        }
        
        // return redirect('/?error=no access');
        
        Session::put('head', 'ss898djjjdksjdjjdksj'); 
            
        return redirect('/actionCenterIBA');
            
    }
    
    $user = DB::table('users')->select('user_id', 'user_session_id', 'user_type', 'user_current_login_password')->where('user_email', '=', $request->input('user_email'))->limit(1)->get();
    $user_count = $user->count();
    
    if($user_count === 0) { 
        
        if(Session::get('login_lock_count') === null) { 
            Session::put('login_lock_count', 1); 
        } else {
            Session::put('login_lock_count', Session::get('login_lock_count') + 1); 
        }

        return redirect('/login?error=email or password incorrect');
        
    } else if($user_count === 1) { 
        
        if(password_verify($request->input('user_current_login_password'), $user[0]->user_current_login_password)) {
            
            $user_session_id = $user[0]->user_session_id;
            $user_id = $user[0]->user_id;
            $user_type = $user[0]->user_type;
            $user_new_session_key = uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true);
            
            if($user_session_id === '' || $user_session_id === null) { 
                return redirect('/login?error=user session is null, please call in');
            }
 
            DB::table('users')->where('user_session_id', $user_session_id)->update(['user_session_id' => $user_new_session_key]); 
            
            if($user_type === 1) {
                Session::put('user_client_id', $user_id); //dont need this
                Session::put('user_session_client_id', $user_new_session_key); 
                Session::put('user_session_client_logged_in', true);
                return redirect('/client');
            } else if($user_type === 2) { 
                Session::put('user_admin_id', $user_id); //dont need this
                Session::put('user_session_admin_id', $user_new_session_key);
                Session::put('user_session_admin_logged_in', true); 
                return redirect('/admin');
            } else if($user_type === 3) { 
                Session::put('user_trainer_id', $user_id);  //dont need this
                Session::put('user_session_trainer_id', $user_new_session_key); 
                Session::put('user_session_trainer_logged_in', true); 
                return redirect('/trainer');
            } else { 
                return redirect('/login?error=server error, please call. id ddklkd');
            }
            
        } else { 
            
            if(Session::get('login_lock_count') === null) { 
                Session::put('login_lock_count', 1); 
            } else {
                Session::put('login_lock_count', Session::get('login_lock_count') + 1); 
            }
            
            return redirect('/login?error=password or email incorrect');         
        }
        
    } else { 
        
        if(Session::get('login_lock_count') === null) { 
            Session::put('login_lock_count', 1); 
        } else {
            Session::put('login_lock_count', Session::get('login_lock_count') + 1); 
        }
        
        return redirect('/login?error=server error or client account, please call id e44894jjf');
        
    }
    
});

//admin

Route::post('/admin_sign_up', function(Request $request) {
    
    if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === null || Session::get('user_session_admin_id') === '') {
        return redirect('/login?error=true');
    }

    $admin_account_id = DB::table('users')->select('admin_connected_acct_id', 'user_W9')->where([['user_session_id', '=', Session::get('user_session_admin_id')]])->limit(1)->get();
    
    if($admin_account_id[0]->user_W9 === 0) { 
        return redirect('/admin?error=Please see legal info at the bottom of the page'); 
    }
    
    require_once(base_path('vendor/stripe/init.php'));

    $stripe = new \Stripe\StripeClient(env('SPK2', false));
    
    try {
    
        $url = $stripe->accountLinks->create([
            'account' => $admin_account_id[0]->admin_connected_acct_id,
            'refresh_url' => 'https://communityservicepros.com/v/login',
            'return_url' => 'https://communityservicepros.com/v/admin',
            'type' => 'account_onboarding'
        ]);
    
    } catch(Exception $e) { 
       
       return redirect('/admin?error='.$e->getMessage()); 
        
    }
    
    return redirect($url->url);
    
});

//trainer

Route::post('/trainer_sign_up', function(Request $request) {
    
    if(!$request->session()->has('user_session_trainer_id') || Session::get('user_session_trainer_id') === null || Session::get('user_session_trainer_id') === '') {
        return redirect('/login');
    }

    $trainer_account_id = DB::table('users')->select('trainer_connected_acct_id', 'user_W9')->where([['user_session_id', '=', Session::get('user_session_trainer_id')]])->limit(1)->get();
    
    return redirect('/trainer?error=payment will be administered by the owner via check'); 

    if($trainer_account_id[0]->user_W9 === 0) { 
        return redirect('/trainer?error=Please see legal info at the bottom of the page'); 
    }    
    
    require_once(base_path('vendor/stripe/init.php'));

    $stripe = new \Stripe\StripeClient(env('SPK2', false));
    
    try {
    
        $url = $stripe->accountLinks->create([
            'account' => $trainer_account_id[0]->trainer_connected_acct_id,
            'refresh_url' => 'https://communityservicepros.com/v/login',
            'return_url' => 'https://communityservicepros.com/v/trainer',
            'type' => 'account_onboarding'
        ]);
    
    } catch(Exception $e) { 
        
        return redirect('/trainer?error='.$e->getMessage()); 
        
    }
    
    return redirect($url->url);
    
});

//admin

Route::get('/admin_request_subscription_cancel', function(Request $request) { 
    
    if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === null || Session::get('user_session_admin_id') === '') {
        return redirect('/login');
    }
    
    $user = DB::table('users')->select('user_requested_subscription_cancel', 'admin_subscription_id', 'id', 'admin_customer_id')->where('user_session_id', '=', Session::get('user_session_admin_id'))->limit(1)->get();
    
    require_once(base_path('vendor/stripe/init.php'));

    $stripe = new \Stripe\StripeClient(env('SPK2', false));
    
    try {
                        
        $stripe->subscriptions->cancel(
            $user[0]->admin_subscription_id,
            []
        );
        
        DB::table('users')->where('id', '=', $user[0]->id)->limit(1)->update(
            ['admin_subscription_customer_match' => '',
            'admin_subscription_id' => '',
            'admin_customer_id' => '',
            'admin_signed_up_for_subscription' => 0,
            'admin_subscription_status' => 'inactive',
            'user_requested_subscription_cancel' => 0,
            'admin_subscription_price' => 0
        ]);
        
        $stripe->customers->delete(
          $user[0]->admin_customer_id,
          []
        ); 
        
        return redirect('/admin?success=your subscription has been deleted');

    } catch(Exception $e) { 
                        
        if(str_contains($e->getMessage(), 'No such subscription')) { 
                            
            DB::table('users')->where('id', '=', $user[0]->id)->limit(1)->update(
                ['admin_subscription_customer_match' => '',
                'admin_subscription_id' => '',
                'admin_customer_id' => '',
                'admin_signed_up_for_subscription' => 0,
                'admin_subscription_status' => 'inactive',
                'user_requested_subscription_cancel' => 0,
                'admin_subscription_price' => 0
            ]);
            
            return redirect('/admin?success=your subscription was already canceled in the dash');
        
        }
        
        return redirect('/admin?error=subscription was canceled and updated or it was not, please call in: '.$e->getMessage());
                        
    }

});

//admin

Route::post('/admin_update_client_subscription', function(Request $request) {
    
    if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === null || Session::get('user_session_admin_id') === '') {
        return redirect('/login');
    }
    
    if($request->input('client_service_description') === null || $request->input('client_service_description') === '') { 
        return redirect('/admin?error=subscription description can not be blank');
    }
    
    $admin_id = DB::table('users')->select('user_id')->where([['user_session_id', '=', Session::get('user_session_admin_id')]])->limit(1)->get();
    
    DB::table('users')->where([['client_assigned_admin', '=', $admin_id[0]->user_id], ['id', '=', $request->input('client_id')]])->limit(1)->update(['client_service_description' => $request->input('client_service_description')]);
        
    return redirect('/admin?success=subscription has been updated');
    
});

//admin

Route::post('/upload_w9_and_license_link_admin', function(Request $request) {
    
    if(!$request->session()->has('user_session_admin_id') || Session::get('user_session_admin_id') === null || Session::get('user_session_admin_id') === '') {
        return redirect('/login');
    }

    if(!str_contains($request->input('w9_and_license'), 'https://send.tresorit.com')) { 
        return redirect('/admin?error=invalid link');
    }
    
    DB::table('users')->where('user_session_id', Session::get('user_session_admin_id'))->limit(1)->update(['user_w9_link_for_license_and_w9' => $request->input('w9_and_license')]);
    
    return redirect('/admin?success=link has been submitted');

});

//trainer

Route::post('/upload_w9_and_license_link_trainer', function(Request $request) {
    
    if(!$request->session()->has('user_session_trainer_id') || Session::get('user_session_trainer_id') === null || Session::get('user_session_trainer_id') === '') {
        return redirect('/login');
    }

    if(!str_contains($request->input('w9_and_license'), 'https://send.tresorit.com')) { 
        return redirect('/trainer?error=invalid link');
    }
    
    DB::table('users')->where('user_session_id', Session::get('user_session_trainer_id'))->limit(1)->update(['user_w9_link_for_license_and_w9' => $request->input('w9_and_license')]);
    
    return redirect('/trainer?success=link has been submitted');

});


//home

Route::post('/reset_password', function(Request $request) {
    
        if(Session::get('login_lock_count_pr') > 3) { 
            return redirect('/?error=max logins attempted, try later');
        }
        
        $user = DB::table('users')->select('user_session_id', 'user_email')->where('user_email', '=', $request->input('user_email'))->limit(1)->get();
        
        if($user->count() === 1) { 
            
           $link_id = $user[0]->user_session_id;
           $email = $user[0]->user_email;
            
           try {
               
                Mail::send('mail',['link' => 'https://communityservicepros.com/v/login_from_reset?p=d797dhjhdsh&id='.$link_id, 'email' => $email], function($message) use ($email) {
                    $message->to($email)->subject("Community Service Pros Password Reset.");
                    $message->from('communityservicepros@gmail.com','Community Service Pros Password Reset');
                });
            
           } catch(Exception $e) { 
               
                return redirect('/reset?error=there was an error processing your request&message='.$e->getMessage());
               
           }
           
            Session::put('login_lock_count_pr', 4);

            return redirect('/confirmation?success=an email has been sent with a link. Please click on it and login and reset your pasword&page=reset');
        
        } else { 
            
            if(Session::get('login_lock_count_pr') === null) { 
                Session::put('login_lock_count_pr', 1); 
            } else {
                Session::put('login_lock_count_pr', Session::get('login_lock_count_pr') + 1); 
            }
            
            return redirect('/reset?error=email not found');
            
        }
    
});

//home

Route::get('/login_from_reset', function(Request $request) {
    
    if(Session::get('login_lock_count_reset_pass') > 10) { 
        return redirect('/?error=max logins attempted, try later');
    } 
    
    if(Session::get('login_lock_count_reset_pass') === null) { 
        Session::put('login_lock_count_reset_pass', 1); 
    } else {
        Session::put('login_lock_count_reset_pass', Session::get('login_lock_count_reset_pass') + 1); 
    }  

    $password = $request->input('p');
    $session_id = $request->input('id');
    
    if($password === 'd797dhjhdsh') { //update this password to avoid someone throwing millions of requests with different session values...
        
        $user = DB::table('users')->select('user_session_id', 'user_id', 'user_type')->where([['user_session_id', '=', $session_id], ['user_type', '!=', 0]])->limit(1)->get();
        
        if($user->count() === 1) { 
            
            $user_session_id = $user[0]->user_session_id;
            $user_id = $user[0]->user_id;
            $user_type = $user[0]->user_type;
            $user_new_session_key = uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true).uniqid(mt_rand(), true);
            
            if($user_session_id === '' || $user_session_id === null) { 
                return redirect('/login?error=user session is null, please call in');
            }

            DB::table('users')->where('user_session_id', $user_session_id)->update(['user_session_id' => $user_new_session_key]); //this should update across all
            
            if($user_type === 1) {
                Session::put('user_client_id', $user_id); //check for this
                Session::put('user_session_client_id', $user_new_session_key); 
                Session::put('user_session_client_logged_in', true);
                return redirect('/client');
            } else if($user_type === 2) { 
                Session::put('user_admin_id', $user_id); //check for this
                Session::put('user_session_admin_id', $user_new_session_key);
                Session::put('user_session_admin_logged_in', true); 
                return redirect('/admin');
            } else if($user_type === 3) { 
                Session::put('user_trainer_id', $user_id);  //check for this
                Session::put('user_session_trainer_id', $user_new_session_key); 
                Session::put('user_session_trainer_logged_in', true); 
                return redirect('/trainer');
            } else { 
                return redirect('/login?error=server error, please call. id ddklkd');
            }
            
        } else { 
            
            return redirect('/login?error=unsuccessful reset attempt, user count incorrect');
            
        }
        
    } else { 
        
        return redirect('/login?error=unsuccessful reset attempt, password incorrect');
        
    }
    
});

//logout

Route::post('/logout', function() {
    Session::flush();
    return redirect('/login');
});

//action center

Route::get('/actionCenterERR', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    }
    
    if(Session::get('login_lock_count_err') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) {
        
        if($password !== null && $password !== '') {
        
            if(Session::get('login_lock_count_err') === null) { 
                Session::put('login_lock_count_err', 1); 
            } else {
                Session::put('login_lock_count_err', Session::get('login_lock_count_err') + 1); 
            }
            
        }
        
        return view('/actionCenterERR', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
   
        //group by and having count > 1 and if count is greater than one display
        // $replica_user_id = DB::table('users')->select('id', 'user_id')->where([[]])->get();
        // $replica_user_session_id = DB::table('users')->select('id', 'user_session_id')->where([[]])->get();
        // $replica_user_email = DB::table('users')->select('id', 'user_email')->where([[]])->get();
        // $replica_user_phone = DB::table('users')->select('id', 'user_phone')->where([[]])->get();
   
        $invalid_user_type = DB::table('users')->select('id', 'user_type')->where([['user_type', '!=', 3], ['user_type', '!=', 2], ['user_type', '!=', 1], ['user_type', '!=', 0]])->get();
        $invalid_user_status = DB::table('users')->select('id', 'user_status')->where([['user_status', '!=', 'active'], ['user_status', '!=', 'inactive'], ['user_type', '!=', 0]])->get();
        $invalid_user_id = DB::table('users')->select('id', 'user_id')->where([['user_type', '!=', 0], ['user_id', '=', '']])->get();
        $invalid_user_email = DB::table('users')->select('id', 'user_email')->where([['user_type', '!=', 0], ['user_email', '=', '']])->get();
        $invalid_user_session_id = DB::table('users')->select('id', 'user_session_id')->where([['user_session_id', '=', '']])->get();
        $invalid_user_current_login_password = DB::table('users')->select('id', 'user_current_login_password')->where([['user_type', '!=', 0], ['user_current_login_password', '=', '']])->get();
        $invalid_user_invisible = DB::table('users')->select('id', 'user_invisible')->where([['user_invisible', '!=', 0], ['user_invisible', '!=', 1]])->get();
        $invalid_user_w9 = DB::table('users')->select('id', 'user_W9')->where([['user_W9', '!=', 0], ['user_W9', '!=', 1]])->get();
        
        $invalid_client_subscription_status = DB::table('users')->select('id', 'client_subscription_status')->where([['user_type', '=', 0], ['client_subscription_status', '!=', 'active'], ['client_subscription_status', '!=', 'inactive']])->get();
        $invalid_client_subscription_customer_match = DB::table('users')->select('id', 'client_subscription_customer_match')->where([['user_type', '=', 0], ['client_subscription_customer_match', '!=', 'match'], ['client_subscription_customer_match', '!=', 'mismatch']])->get();
        $invalid_client_admin_id = DB::table('users')->select('id', 'client_assigned_admin')->where([['user_type', '=', 0], ['client_assigned_admin', '=', '']])->get();
        $invalid_client_email = DB::table('users')->select('id', 'client_email')->where([['user_type', '=', 0],['client_email', '=', '']])->get();
        $invalid_client_phone = DB::table('users')->select('id', 'client_phone')->where([['user_type', '=',0], ['client_phone', '=', '']])->get();
        $invalid_client_subscription_id = DB::table('users')->select('id', 'client_subscription_id')->where([['user_type', '=', 0], ['client_subscription_id', '=', '']])->get();
        $invalid_client_customer_id = DB::table('users')->select('id', 'client_customer_id')->where([['user_type', '=', 0], ['client_customer_id', '=', '']])->get();

        $invalid_admin_subscription_status = DB::table('users')->select('id', 'admin_subscription_status')->where([['user_type', '=', 2], ['admin_subscription_status', '!=', 'inactive'], ['admin_subscription_status', '!=', 'active']])->get();
        $invalid_admin_subscription_customer_match = DB::table('users')->select('id', 'admin_subscription_customer_match')->where([['user_type', '=', 2], ['admin_subscription_customer_match', '!=', ''], ['admin_subscription_customer_match', '!=', 'match'], ['admin_subscription_customer_match', '!=', 'mismatch']])->get();
        $invalid_admin_trainer_id = DB::table('users')->select('id', 'admin_assigned_trainer')->where([['user_type', '=', 2], ['admin_assigned_trainer', '=', '']])->get();
        $invalid_admin_connected_acct_id = DB::table('users')->select('id', 'admin_connected_acct_id')->where([['user_type', '=', 2], ['admin_connected_acct_id', '=', '']])->get();
        $invalid_admin_signed_up_for_subscription = DB::table('users')->select('id', 'admin_signed_up_for_subscription')->where([['user_type', '=', 2], ['admin_signed_up_for_subscription', '!=', 0], ['admin_signed_up_for_subscription', '!=', 1]])->get();

        $invalid_trainer_connected_acct_id = DB::table('users')->select('id', 'trainer_connected_acct_id')->where([['user_type', '=', 3], ['trainer_connected_acct_id', '=', '']])->get();
        
        return view('/actionCenterERR', [
            'can_view' => true,
            'invalid_user_type' => $invalid_user_type,
            'invalid_user_status' => $invalid_user_status,
            'invalid_user_id' => $invalid_user_id,
            'invalid_user_email' => $invalid_user_email,
            'invalid_user_session_id' => $invalid_user_session_id,
            'invalid_user_current_login_password' => $invalid_user_current_login_password,
            'invalid_user_invisible' => $invalid_user_invisible,
            'invalid_user_w9' => $invalid_user_w9,
            'invalid_client_subscription_status' => $invalid_client_subscription_status,
            'invalid_client_subscription_customer_match' => $invalid_client_subscription_customer_match,
            'invalid_client_admin_id' => $invalid_client_admin_id,
            'invalid_client_email' => $invalid_client_email,
            'invalid_client_phone' => $invalid_client_phone,
            'invalid_client_subscription_id' => $invalid_client_subscription_id,
            'invalid_client_customer_id' => $invalid_client_customer_id,
            'invalid_admin_subscription_status' => $invalid_admin_subscription_status,
            'invalid_admin_subscription_customer_match' => $invalid_admin_subscription_customer_match,
            'invalid_admin_trainer_id' => $invalid_admin_trainer_id,
            'invalid_admin_connected_acct_id' => $invalid_admin_connected_acct_id,
            'invalid_admin_signed_up_for_subscription' => $invalid_admin_signed_up_for_subscription,
            'invalid_trainer_connected_acct_id' => $invalid_trainer_connected_acct_id
        ]);

    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::get('/actionCenterIBA', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    }
    
    if(Session::get('login_lock_count_iba') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) {
        
        if($password !== null && $password !== '') {
        
            if(Session::get('login_lock_count_iba') === null) { 
                Session::put('login_lock_count_iba', 1); 
            } else {
                Session::put('login_lock_count_iba', Session::get('login_lock_count_iba') + 1); 
            }
            
        }
        
        return view('/actionCenterIBA', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(
            env('SPK2', false)
        );
        
        $admin_and_trainer_accounts = DB::table('users')->select('id', 'admin_connected_acct_id', 'trainer_connected_acct_id', 'user_type', 'user_status', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 3]])->orWhere([['user_type', '=', 2]])->get();
        
        $account_error_set = [];
        $update_count = 0;
        
        foreach($admin_and_trainer_accounts as $account_row) { 
            
            $accountId = $account_row->user_type ===  2 ? $account_row->admin_connected_acct_id : $account_row->trainer_connected_acct_id;
            
            try {
                
                usleep(10005);

                $account = $stripe->accounts->retrieve(
                  $accountId,
                  []
                );
                
                $transfer_status = is_object($account->capabilities) === true ? $account->capabilities->transfers : 'inactive';
                $card_payments_status = is_object($account->capabilities) === true ? $account->capabilities->card_payments : 'inactive';
                $details_submitted = $account->details_submitted;
                $charges_enabled = $account->charges_enabled;
                
                if(($details_submitted === false || $charges_enabled === false || $transfer_status === 'inactive' || $card_payments_status === 'inactive') && $account_row->user_status === 'active') {
                    DB::table('users')->where(['id', '=', $account_row->id])->limit(1)->update(['user_status' => 'inactive']); 
                    $update_count = $update_count + 1;
                } else if(($details_submitted === true && $charges_enabled === true && $transfer_status === 'active' && $card_payments_status === 'active') && $account_row->user_status === 'inactive') { 
                    DB::table('users')->where(['id', '=', $account_row->id])->limit(1)->update(['user_status' => 'active']); 
                    $update_count = $update_count + 1;
                } else { 
                    //api matches database
                }
                
            } catch(Exception $e) { 
                
                $account_error_set[] = (object) [
                    'user_type' => $account_row->user_type,
                    'id' => $account_row->id,
                    'error' => $e->getMessage(),
                    'user_name' => $account_row->user_name, 
                    'phone' => $account_row->user_phone, 
                    'email' => $account_row->user_email
                ];
                
            }
            
        }
        
        $inactive_trainers = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 3],  ['user_status', '=', 'inactive'], ['user_invisible', '=', 0]])->get();
        $inactive_admins = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 2],  ['user_status', '=', 'inactive'], ['user_invisible', '=', 0]])->get();

        return view('/actionCenterIBA', [
            'inactive_trainers' => $inactive_trainers,
            'inactive_admins' =>  $inactive_admins,
            'account_error_set' => $account_error_set,
            'update_count' => $update_count,
            'can_view' => true
        ]);
        
    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::get('/actionCenterIS', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_is') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($password !== null && $password !== '') {
        
            if(Session::get('login_lock_count_is') === null) { 
                Session::put('login_lock_count_is', 1); 
            } else {
                Session::put('login_lock_count_is', Session::get('login_lock_count_is') + 1); 
            }
        
        }
        
        return view('/actionCenterIS', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(
            env('SPK2', false)
        );
        
        $clients_and_admin_subscriptions = DB::table('users')->select('id', 'client_subscription_id', 'admin_subscription_id', 'user_type', 'admin_subscription_status', 'client_subscription_status', 'client_customer_id', 'admin_customer_id', 'client_subscription_customer_match', 'admin_subscription_customer_match', 'user_name', 'user_phone', 'user_email', 'client_phone', 'client_email')->where('user_type', '=', 0)->orWhere([['user_type', '=', 2], ['admin_signed_up_for_subscription', '=', 1]])->get();
        
        $subscription_error_set = [];
        $update_count = 0;
        
        foreach($clients_and_admin_subscriptions as $subscription) { //seperate into trainer and admin and do like that
            
            $subscriptionId = $subscription->user_type ===  0 ? $subscription->client_subscription_id : $subscription->admin_subscription_id;
            
            try {
                
                usleep(10005);
            
                $subscription_status = $stripe->subscriptions->retrieve(
                    $subscriptionId, 
                    []
                );
                
                if($subscription->user_type === 0) { 
                    
                    if($subscription_status->status === 'active' && $subscription->client_subscription_status !== 'active') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['client_subscription_status' => 'active']);
                       $update_count = $update_count + 1;
                    } else if($subscription_status->status !== 'active' && $subscription->client_subscription_status === 'active') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['client_subscription_status' => 'inactive']);
                       $update_count = $update_count + 1;
                    } else { 
                        //api matches database
                    }
                    
                    if(($subscription_status->customer !== $subscription->client_customer_id) && $subscription->client_subscription_customer_match === 'match') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['client_subscription_customer_match' => 'mismatch']);
                       $update_count = $update_count + 1;
                    } else if(($subscription_status->customer === $subscription->client_customer_id) && $subscription->client_subscription_customer_match === 'mismatch') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['client_subscription_customer_match' => 'match']);
                       $update_count = $update_count + 1;
                    } else { 
                        //api matches database
                    }
                    
                } else if($subscription->user_type === 2) {
                    
                    //only updating where they are signed up
                    
                    if($subscription_status->status === 'active' && $subscription->admin_subscription_status !== 'active') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['admin_subscription_status' => 'active']);
                       $update_count = $update_count + 1;
                    } else if($subscription_status->status !== 'active' && $subscription->admin_subscription_status === 'active') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['admin_subscription_status' => 'inactive']);
                       $update_count = $update_count + 1;
                    } else { 
                        //api matches database
                    }
                    
                    if(($subscription_status->customer !== $subscription->admin_customer_id) && $subscription->admin_subscription_customer_match === 'match') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['admin_subscription_customer_match' => 'mismatch']);
                       $update_count = $update_count + 1;
                    } else if(($subscription_status->customer === $subscription->admin_customer_id) && $subscription->admin_subscription_customer_match === 'mismatch') { 
                       DB::table('users')->where('id', '=', $subscription->id)->limit(1)->update(['admin_subscription_customer_match' => 'match']);
                       $update_count = $update_count + 1;
                    } else { 
                        //api matches database
                    }
                
                }
                
            } catch(Exception $e) { 
                
                $phone = $subscription->user_type === 0 ? $subscription->client_phone : $subscription->user_phone;
                $email = $subscription->user_type === 0 ? $subscription->client_email : $subscription->user_email;
                
                $subscription_error_set[] = (object) [
                    'user_type' => $subscription->user_type,
                    'id' => $subscription->id,
                    'error' => $e->getMessage(),
                    'user_name' => $subscription->user_name, 
                    'phone' => $phone, 
                    'email' => $email
                ];
                
            }
            
        }
        
        
        $inactive_clients_before_cancel = DB::table('users')->select('id', 'user_name', 'client_phone', 'client_email', 'client_subscription_price', 'client_sub_duration', 'client_cancel_date')->where([['user_type', '=', 0], ['client_subscription_status', '=', 'inactive'], ['client_cancel_date', '>=', date('Y-m-d')]])->get();
        $inactive_clients_after_cancel = DB::table('users')->select('id', 'user_name', 'client_phone', 'client_email', 'client_subscription_price', 'client_sub_duration', 'client_cancel_date')->where([['user_type', '=', 0],  ['client_subscription_status', '=', 'inactive'], ['client_cancel_date', '<=', date('Y-m-d')]])->get();
        $inactive_admins = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 2],  ['admin_subscription_status', '=', 'inactive'], ['admin_signed_up_for_subscription', '=', 1]])->get();
        $admin_mismatches = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where('admin_subscription_customer_match', '=', 'mismatch')->get();
        $client_mismatches = DB::table('users')->select('id', 'user_name', 'client_phone', 'client_email')->where('client_subscription_customer_match', '=', 'mismatch')->get();
        $total_mismatch_count = $admin_mismatches->count() + $client_mismatches->count();

        return view('actionCenterIS', [
            'inactive_clients_before_cancel' => $inactive_clients_before_cancel,
            'inactive_clients_after_cancel' => $inactive_clients_after_cancel,
            'inactive_admins' => $inactive_admins,
            'admin_mismatches' => $admin_mismatches,
            'client_mismatches' => $client_mismatches,
            'total_mismatch_count' => $total_mismatch_count,
            'subscription_error_set' => $subscription_error_set,
            'update_count' => $update_count,
            'can_view' => true
        ]);
        
    } else { 
        
        return redirect('/login');
        
    }

});

//action center

Route::get('/actionCenterUTD', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_utd') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($password !== null && $password !== '') {
        
            if(Session::get('login_lock_count_utd') === null) { 
                Session::put('login_lock_count_utd', 1); 
            } else {
                Session::put('login_lock_count_utd', Session::get('login_lock_count_utd') + 1); 
            }
        
        }
        
        return view('/actionCenterUTD', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
    
        $available_for_update = DB::table('users')->select('user_name', 'client_email', 'client_phone', 'id', 'client_subscription_id', 'client_assigned_admin', 'user_time_since_last_subscription_update')->where('user_type', '=', 0)->get();
        
        $subscription_error_set = [];
        $update_count = 0;
        $update_count_90 = 0;
        $update_count_80 = 0;
        
        require_once(base_path('vendor/stripe/init.php'));
        
        $stripe = new \Stripe\StripeClient(
            env('SPK2', false)
        );
        
        foreach($available_for_update as $subscription) {
            
                try {
                    
                    usleep(10005);
                    
                    $admin_id = DB::table('users')->select('admin_connected_acct_id', 'admin_subscription_status', 'admin_signed_up_for_subscription')->where('user_id', '=', $subscription->client_assigned_admin)->get();
                
                    if($admin_id[0]->admin_subscription_status === 'active' && $admin_id[0]->admin_signed_up_for_subscription === 1) { //signed up and active
                
                        $subscription_status = $stripe->subscriptions->update(
                            $subscription->client_subscription_id,
                                ['transfer_data' => [
                                    'destination' => $admin_id[0]->admin_connected_acct_id,
                                    'amount_percent' => 20],
                        ]);
                        
                        $update_count = $update_count + 1;
                        $update_count_90 = $update_count_90 + 1;
                    
                    } else if($admin_id[0]->admin_subscription_status === 'inactive' && $admin_id[0]->admin_signed_up_for_subscription === 1) { //signed up and inactive
                        
                        $subscription_status = $stripe->subscriptions->update(
                            $subscription->client_subscription_id,
                                ['transfer_data' => [
                                    'destination' => $admin_id[0]->admin_connected_acct_id,
                                    'amount_percent' => 20],
                        ]);   
                        
                        $update_count = $update_count + 1;
                        $update_count_80 = $update_count_80 + 1;
                        
                    } else if($admin_id[0]->admin_subscription_status === 'inactive' && $admin_id[0]->admin_signed_up_for_subscription === 0) { //not signed up or has canceled
                        
                        $subscription_status = $stripe->subscriptions->update(
                            $subscription->client_subscription_id,
                                ['transfer_data' => [
                                    'destination' => $admin_id[0]->admin_connected_acct_id,
                                    'amount_percent' => 20],
                        ]);   
                        
                        $update_count = $update_count + 1; 
                        $update_count_80 = $update_count_80 + 1;
                        
                    } else { 
                        
                        $subscription_error_set[] = (object) [
                            'user_type' => 0,
                            'id' => $subscription->id,
                            'error' => 'admin sub status or signed up has an incorrect value. ERROR UPDATING TD. CONCERN!',
                            'name' => $subscription->user_name, 
                            'phone' => $subscription->client_phone, 
                            'email' => $subscription->client_email,
                            'client_assigned_admin' => $subscription->client_assigned_admin,
                        ];
                        
                    }
                    
                } catch(Exception $e) { 
                    
                    $subscription_error_set[] = (object) [
                        'user_type' => 0,
                        'id' => $subscription->id,
                        'error' => $e->getMessage(),
                        'name' => $subscription->user_name, 
                        'phone' => $subscription->client_phone, 
                        'email' => $subscription->client_email,
                        'client_assigned_admin' => $subscription->client_assigned_admin,
                    ];
                    
                }
            
        }
        
        return view('actionCenterUTD', [
            'subscription_error_set' => $subscription_error_set,
            'update_count' => $update_count,
            'update_count_80' => $update_count_80,
            'update_count_90' => $update_count_90,
            'can_view' => true
        ]);
        
    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::get('/actionCenterINV', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_inv') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($password !== null && $password !== '') {
        
            if(Session::get('login_lock_count_inv') === null) { 
                Session::put('login_lock_count_inv', 1); 
            } else {
                Session::put('login_lock_count_inv', Session::get('login_lock_count_inv') + 1); 
            }
        
        }
        
        return view('/actionCenterINV', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
    
        $invisible_users_inactive_trainers = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 3],  ['user_status', '=', 'inactive'], ['user_invisible', '=', 1]])->get();
        $invisible_users_inactive_admins = DB::table('users')->select('id', 'user_name', 'user_phone', 'user_email')->where([['user_type', '=', 2],  ['user_status', '=', 'inactive'], ['user_invisible', '=', 1]])->get();
        
        return view('actionCenterINV', [
            'invisible_users_inactive_trainers' => $invisible_users_inactive_trainers,
            'invisible_users_inactive_admins' => $invisible_users_inactive_admins,
            'can_view' => true
        ]);
        
    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::get('/actionCenterW9', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_w9') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($password !== null && $password !== '') { //voids initial load
        
            if(Session::get('login_lock_count_w9') === null) { 
                Session::put('login_lock_count_w9', 1); 
            } else {
                Session::put('login_lock_count_w9', Session::get('login_lock_count_w9') + 1); 
            }
        
        }
        
        return view('/actionCenterW9', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
    
        $trainers_without_w9 = DB::table('users')->select('id', 'user_start_date', 'user_name', 'user_phone', 'user_email', 'user_id', 'user_w9_link_for_license_and_w9')->where([['user_type', '=', 3],  ['user_W9', '=', 0], ['user_invisible', '=', 0]])->orderBy('id', 'DESC')->get();
        $admins_without_w9 = DB::table('users')->select('id', 'user_start_date', 'user_name', 'user_phone', 'user_email', 'user_id', 'user_w9_link_for_license_and_w9')->where([['user_type', '=', 2],  ['user_W9', '=', 0], ['user_invisible', '=', 0]])->orderBy('id', 'DESC')->get();
        
        foreach($trainers_without_w9 as $trainers) {
            
            $now = time();
            $your_date = strtotime($trainers->user_start_date);
            $datediff = $now - $your_date;
            $datediff = $datediff / (60 * 60 * 24);
            
            if(floor($datediff) > 70) { 
                DB::table('users')->where('id', '=', $trainers->id)->limit(1)->update(['user_invisible' => 1]);
            }
            
            $trainers->days_without_w9 = floor($datediff);
            
        }
        
        foreach($admins_without_w9 as $admins) {
            
            $now = time();
            $your_date = strtotime($admins->user_start_date);
            $datediff = $now - $your_date;
            $datediff = $datediff / (60 * 60 * 24);
            
            if(floor($datediff) > 70) { 
                DB::table('users')->where('id', '=', $admins->id)->limit(1)->update(['user_invisible' => 1]);
            }
            
            $admins->days_without_w9 = floor($datediff);
            
        }
        
        return view('actionCenterW9', [ 
            'trainers_without_w9' => $trainers_without_w9,
            'admins_without_w9' => $admins_without_w9,
            'can_view' => true
        ]);
    
    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::post('/actionCenterW9MakeTrue', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_w9true') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $id = $request->input('admin_or_trainer_id');
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 

        if(Session::get('login_lock_count_w9true') === null) { 
            Session::put('login_lock_count_w9true', 1); 
        } else {
            Session::put('login_lock_count_w9true', Session::get('login_lock_count_w9true') + 1); 
        }
        
        return redirect('/actionCenterW9?error=wrong password');
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        $rows_affected = DB::table('users')->where('user_id', '=', $id)->limit(1)->update(['user_W9' => 1, 'user_w9_link_for_license_and_w9' => '']);
        
        if($rows_affected === 1) { 
            $response = '1 row affected';
            $message = 'success';
        } else if($rows_affected > 1) { 
            $response = 'more than one row affected';
            $message = 'error';
        } else { 
            $response = 'could not find id';
            $message = 'error';
        }
        
        return redirect('/actionCenterW9?'.$message.'='.$response);
        
    } else { 
        
        return redirect('/actionCenterW9?error=something went wrong');
        
    }
    
});

//action center

Route::post('/make_invisible_ba', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_invba') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    $submission_type = $request->input('submission_type');
    $client_id = $request->input('client_id');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if(Session::get('login_lock_count_invba') === null) { 
            Session::put('login_lock_count_invba', 1); 
        } else {
            Session::put('login_lock_count_invba', Session::get('login_lock_count_invba') + 1); 
        }
        
        return redirect('actionCenterIBA?error=wrong password');
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($submission_type === 'all') { 
            
            DB::table('users')->where([['user_type', '=', 2], ['user_status', '=', 'inactive'], ['user_invisible', '=', 0]])->orWhere([['user_type', '=', 3], ['user_status', '=', 'inactive'], ['user_invisible', '=', 0]])->limit(5)->update(['user_invisible' => 1]);
            
            return redirect('actionCenterIBA?success=all inactive made invisible');
            
        } else if($submission_type === 'one') { 
            
            DB::table('users')->where([['id', '=', $client_id], ['user_status', '=', 'inactive'], ['user_invisible', '=', 0]])->limit(1)->update(['user_invisible' => 1]);
            
            return redirect('actionCenterIBA?success=one inactive made invisible&id='.$client_id);
            
        } else { 
            
            return redirect('actionCenterIBA?error=could not make inactive invisible');
            
        }
        
    } else { 
        
        return redirect('actionCenterIBA?error= something went wrong');
        
    }
    
});

//action center

Route::post('/make_visible_ba', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');

    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_inv') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    $submission_type = $request->input('submission_type');
    $client_id = $request->input('client_id');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if(Session::get('login_lock_count_inv') === null) { 
            Session::put('login_lock_count_inv', 1); 
        } else {
            Session::put('login_lock_count_inv', Session::get('login_lock_count_inv') + 1); 
        }
        
        return redirect('actionCenterINV?error=wrong password');
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) {
        
        if($submission_type === 'all') { 
            
            DB::table('users')->where([['user_type', '=', 2], ['user_status', '=', 'inactive'], ['user_invisible', '=', 1]])->orWhere([['user_type', '=', 3], ['user_status', '=', 'inactive'], ['user_invisible', '=', 1]])->limit(5)->update(['user_invisible' => 0]);
            
            return redirect('actionCenterINV?success=all inactive made visible');
            
        } else if($submission_type === 'one') { 
            
            DB::table('users')->where([['id', '=', $client_id], ['user_status', '=', 'inactive'], ['user_invisible', '=', 1]])->limit(1)->update(['user_invisible' => 0]);
            
            return redirect('actionCenterINV?success=one inactive made visible');
            
        } else { 
            
            return redirect('actionCenterINV?error=could not make inactive visible');
            
        }
        
    } else { 
        
        return redirect('actionCenterINV?error=something went wrong');
        
    }
    
});

//action center

Route::get('/actionCenterCAB', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');
    
    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_cab') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if($password !== null && $password !== '') { //voids initial load
        
            if(Session::get('login_lock_count_cab') === null) { 
                Session::put('login_lock_count_cab', 1); 
            } else {
                Session::put('login_lock_count_cab', Session::get('login_lock_count_cab') + 1); 
            }
        
        }
        
        return view('/actionCenterCAB', [
            'can_view' => false
        ]);
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        $subscriptions = DB::table('users')->select('id', 'client_cancel_date', 'client_email', 'user_name', 'client_phone')->where([['user_type', '=', 0],['client_cancel_date','<=', date('Y-m-d')]])->get();
    
        return view('actionCenterCAB', [ 
            'subs_to_be_deleted' => $subscriptions,
            'can_view' => true
        ]);
    
    } else { 
        
        return redirect('/login');
        
    }
    
});

//action center

Route::post('/delete_canceled_subs', function(Request $request) {
    
    try {
               
        Mail::send('ac',['body' => 'user has logged into the action center...'], function($message) {
            $message->to('communityserviceproslogin@gmail.com')->subject("User has logged into action center.");
            $message->from('communityservicepros@gmail.com','User has logged into action Center');
        });
            
    } catch(Exception $e) { 
               
        return redirect('/?error=there was an error processing your request&message='.$e->getMessage());
               
    }
    
    // return redirect('/?error=no access');

    if(Session::get('head') !== 'ss898djjjdksjdjjdksj') {
        return redirect('/login');
    } 
    
    if(Session::get('login_lock_count_dcab') > 3) { 
        return redirect('/?error=max logins attempted, try later');
    }
    
    $password = $request->input('password');
    
    if(!password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) { 
        
        if(Session::get('login_lock_count_dcab') === null) { 
            Session::put('login_lock_count_dcab', 1); 
        } else {
            Session::put('login_lock_count_dcab', Session::get('login_lock_count_dcab') + 1); 
        }
        
        return redirect('actionCenterCAB?error=wrong password');
        
    } else if(password_verify($password, '$2y$10$PzDCcWK4dYpEXDJoUkBZjuU4TxTGIe0O16ODMXC22PQgoif/v1/Z.')) {
        
        $cancel_count = 0;
    
        $subscriptions = DB::table('users')->select('id', 'client_cancel_date')->where('user_type', '=', 0)->get();
        
        foreach($subscriptions as $subscription) { 
        
            if(date('Y-m-d') > date($subscription->client_cancel_date)) {
            
                    DB::table('users')->where('id', $subscription->id)->limit(1)->delete();
                    $cancel_count += 1;
            
            }
        
        }
        
        return redirect('actionCenterCAB?success=subs deleted-'.$cancel_count);
        
    } else { 
        
        return redirect('actionCenterCAB?error=something went wrong');
        
    }
    
});
