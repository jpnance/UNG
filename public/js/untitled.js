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

	var $homePicksBoard = $('#home-picks-board');

	if ($homePicksBoard.length) {
		var showPickError = function(message) {
			$('#modal .modal-body').text(message || 'Something went wrong');
			$('#modal').modal('show');
		};

		var pickButtonHtml = function(teamAbbr, state) {
			var currentTeam = state.currentWeekPick && state.currentWeekPick.team;
			var isCurrentPick = currentTeam === teamAbbr;
			var isUsed = false;
			var usedInWeek = null;

			state.picks.forEach(function(pick) {
				if (pick.team === teamAbbr) {
					if (isCurrentPick) {
						return;
					}

					isUsed = true;
					usedInWeek = pick.week;
				}
			});

			var lockedSet = {};
			(state.lockedTeams || []).forEach(function(team) {
				lockedSet[team] = true;
			});

			var isTeamLocked = state.weekDeadlinePassed || lockedSet[teamAbbr];

			if (isCurrentPick) {
				if (state.isPickLocked) {
					return '<span class="btn btn-sm btn-secondary disabled pick-btn pick-btn-disabled"><i class="fa-solid fa-lock"></i></span>';
				}

				return '<a class="btn btn-sm btn-primary pick-btn" href="/unpick">✓</a>';
			}

			if (isUsed) {
				return '<span class="btn btn-sm btn-outline-muted disabled pick-btn pick-btn-disabled">' + usedInWeek + '</span>';
			}

			if (isTeamLocked) {
				return '<span class="btn btn-sm btn-outline-muted disabled pick-btn pick-btn-disabled"><i class="fa-solid fa-lock"></i></span>';
			}

			if (state.isPickLocked) {
				return '<span class="btn btn-sm btn-outline-muted disabled pick-btn pick-btn-disabled">○</span>';
			}

			return '<a class="btn btn-sm btn-outline-muted pick-btn pick-btn-available" href="/pick/' + teamAbbr + '">○</a>';
		};

		var applyHomePickState = function(state) {
			$homePicksBoard.toggleClass('pick-locked', !!state.isPickLocked);

			var showNoPickAlert = !state.isEliminated && !state.currentWeekPick && !state.isPickLocked;
			$('#home-no-pick-alert').toggleClass('d-none', !showNoPickAlert);

			$homePicksBoard.find('tr[data-team]').each(function() {
				var $row = $(this);
				var teamAbbr = $row.attr('data-team');
				var isCurrentPick = !!(state.currentWeekPick && state.currentWeekPick.team === teamAbbr);

				$row.toggleClass('table-active', isCurrentPick);
				$row.find('td').first().html(pickButtonHtml(teamAbbr, state));
			});

			$homePicksBoard.find('tr[data-week]').each(function() {
				var $row = $(this);
				var week = parseInt($row.attr('data-week'), 10);
				var pick = state.picks.find(function(p) { return p.week === week; });
				var $cell = $row.find('.home-your-pick-cell');
				var isCurrentWeek = week === Number(state.currentWeek);

				$row.toggleClass('table-active', isCurrentWeek);

				if (pick) {
					$cell.text(pick.team);
				}
				else if (state.isEliminated && week > state.eliminatedWeek) {
					$cell.html('<span class="text-muted">—</span>');
				}
				else if (week < state.currentWeek || (state.isEliminated && week === state.eliminatedWeek)) {
					$cell.html('<span class="text-danger pick-missed">×</span>');
				}
				else {
					$cell.empty();
				}
			});
		};

		$homePicksBoard.on('click', 'a.pick-btn', function(e) {
			var href = $(this).attr('href');

			if (!href || (href.indexOf('/pick/') !== 0 && href !== '/unpick')) {
				return;
			}

			e.preventDefault();

			if ($homePicksBoard.hasClass('picking')) {
				return;
			}

			$homePicksBoard.addClass('picking');

			$.ajax({
				url: href,
				dataType: 'json',
				headers: { Accept: 'application/json' }
			})
				.done(function(data) {
					if (data && data.ok) {
						applyHomePickState(data);
						return;
					}

					showPickError((data && data.error) || 'Something went wrong');
				})
				.fail(function(xhr) {
					var message = (xhr.responseJSON && xhr.responseJSON.error) || xhr.responseText || 'Something went wrong';
					showPickError(message);
				})
				.always(function() {
					$homePicksBoard.removeClass('picking');
				});
		});
	}
});
