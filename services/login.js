module.exports.loginPrompt = function(request, response) {
	var templateData = {};

	if (request.query.error == 'invalid-email') {
		templateData.error = { message: 'Invalid email address.' };
	}
	else if (request.query.error == 'not-found') {
		templateData.error = { message: 'No user found for that email address.' };
	}
	else if (request.query.error == 'unknown') {
		templateData.error = { message: 'Unknown server error.' };
	}
	else if (request.query.success == 'email-sent') {
		templateData.success = { message: 'Check your email for your login link!' };
	}

	response.render('login', templateData);
};

