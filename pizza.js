var uuid = require('uuid'),
    amqp = require('amqp');

var creds = require('./creds');
console.log(creds);

var connection = amqp.createConnection({
	host: '54.149.117.183',
	login: creds.login,
	password: creds.password
});

connection.on('error', function(err) {
	console.error(err);
})

var orderId = uuid.v4();
var orderPizza = function(exchange, coupon) {
	console.log('got the exchange!');
	var pizzaOrder = {
		Name: "Eric & Allan",
		Address: "555 Main St.",
		Toppings: ["Pizza", "Yo dawg!"],
		OrderId: orderId
	};
	if (coupon) {
		pizzaOrder.Coupon = coupon;
	}

	exchange.publish('', JSON.stringify(pizzaOrder), {}, pizzaOrdered);
};

var pizzaOrdered = function(err) {
	if (err) {
		console.error("error: " + err);
	}
	else {
		console.log("message published");
	}
};

connection.on('ready', function() {
	console.log("Connected to rabbit!");

	var exchangeOptions = {
		type: 'fanout',
		durable: true,
		autoDelete: false,
		confirm: true
	};

	connection.exchange('pizzarequested.v1', exchangeOptions, function(pizzaRequestedExchange) {
		orderPizza(pizzaRequestedExchange);

		connection.exchange('couponissued.v1', exchangeOptions, function(couponIssuedExchange) {
			connection.queue('couponissued.v1.eric-and-allan', {}, function(queue) {
				queue.bind(couponIssuedExchange, '');
				queue.subscribe(function(message) {
					console.log(message);
					var couponMessage = JSON.parse(message);
					if (couponMessage.OrderId === orderId) {
						orderPizza(pizzaRequestedExchange, couponMessage.Coupon)
					}
				})
			});
		});
	});
	
});
