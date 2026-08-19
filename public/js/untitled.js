$(document).ready(function() {
	$('form[name=login]').on('click', 'button', function(e) {
		var $this = $(e.currentTarget);
		var $form = $($this.parents('form')[0]);

		$this.attr('disabled', true);
		e.preventDefault();

		$.post($form.attr('action'), $form.serializeArray(), function() {
			window.location = '/login?success=email-sent';
		}).fail(function(response) {
			if (response.status == 400) {
				window.location = '/login?error=invalid-email';
			}
			else if (response.status == 404) {
				window.location = '/login?error=not-found';
			}
			else {
				window.location = '/login?error=unknown';
			}
		});
	});
});
