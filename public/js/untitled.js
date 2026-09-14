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

	var $loginUserSelect = $('#loginUser');

	if ($loginUserSelect.length) {
		$.get('/api/login-users', function(users) {
			$loginUserSelect.empty().append('<option value="">-- Select a user --</option>');

			users.forEach(function(user) {
				$loginUserSelect.append(
					$('<option>')
						.val(JSON.stringify(user))
						.text(user.firstName + ' ' + user.lastName + ' (' + user.username + ')')
				);
			});
		});

		$loginUserSelect.on('change', function() {
			if (!this.value) return;

			var user = JSON.parse(this.value);
			$('#username').val(user.username);
			$('#firstName').val(user.firstName);
			$('#lastName').val(user.lastName);
			$('#displayName').val(user.firstName);
		});
	}

	var $commentary = $('#commentary');

	if ($commentary.length && window.commentaryData) {
		var $preview = $('#commentaryPreview');
		var $copyButton = $('#copyCommentary');
		var $status = $('#commentaryStatus');
		var lastSaved = $commentary.val();
		var saveTimer = null;
		var saving = false;
		var queued = false;
		var SAVE_DELAY = 1500;

		var renderCommentary = function(text) {
			var seen = {};

			return (text || '').replace(/@(!?)([A-Za-z0-9]+)/g, function(match, force, token) {
				var team = window.commentaryData.teams[token.toLowerCase()];

				if (!team) {
					return match;
				}

				var firstMention = !seen[team.name];
				seen[team.name] = true;

				if (team.probability == null || (!force && !firstMention)) {
					return team.name;
				}

				return team.name + ' (' + team.probability + '%)';
			});
		};

		var updatePreview = function() {
			$preview.text(renderCommentary($commentary.val()));
		};

		var setStatus = function(text) {
			$status.text(text);
		};

		var saveCommentary = function() {
			var body = $commentary.val();

			if (body === lastSaved) {
				return;
			}

			if (saving) {
				queued = true;
				return;
			}

			saving = true;
			setStatus('Saving…');

			$.post('/admin/commentary', { commentary: body })
				.done(function() {
					lastSaved = body;
					setStatus('Saved');
				})
				.fail(function() {
					setStatus('Save failed');
				})
				.always(function() {
					saving = false;

					if (queued) {
						queued = false;
						saveCommentary();
					}
				});
		};

		$commentary.on('input', function() {
			updatePreview();
			clearTimeout(saveTimer);
			saveTimer = setTimeout(saveCommentary, SAVE_DELAY);
		});

		$('#commentaryForm').on('submit', function(e) {
			e.preventDefault();
			clearTimeout(saveTimer);
			saveCommentary();
		});

		$(window).on('pagehide', function() {
			clearTimeout(saveTimer);
			if ($commentary.val() !== lastSaved) {
				navigator.sendBeacon('/admin/commentary', new URLSearchParams({ commentary: $commentary.val() }));
			}
		});

		updatePreview();

		$copyButton.on('click', function() {
			navigator.clipboard.writeText(renderCommentary($commentary.val())).then(function() {
				$copyButton.text('Copied!');

				setTimeout(function() {
					$copyButton.text('Copy for Email');
				}, 2000);
			});
		});
	}
});
