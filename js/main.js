function $(selector, el) {
	if (!el) {el = document;}
	return el.querySelectorAll(selector);
}

var GAME = {
	board: new Board(),
	share: function() {
		Clay.client({
			method: 'kik.send',
			params: [{
				text: 'Come play Prism, the most addicting game on Kik!',
				title: 'Prism',
				data: {
					gameKey: 'prism'
				}
			}]
		})
		.then(null, function (err) {
			console.error(err)
		})
	}
}

var $grid = $('.grid')[0]
Events.on('move', function(move) {
	if (move.fromRow === move.toRow && move.fromCol === move.toCol) return;
	var $tiles = $('.tile-'+move.fromRow+'-'+move.fromCol)
	var $old = $('.tile-'+move.toRow+'-'+move.toCol)[0]
	for(var i=0;i<$tiles.length;i++) {
		$tiles[i].className = $tiles[i].className.replace(/tile-\d-\d/, 'tile-'+move.toRow+'-'+move.toCol)
	}

	if ($old) {
		setTimeout(function() {
			try {
				for(var i=0;i<$tiles.length;i++) {
						$tiles[i].parentElement.removeChild($tiles[i])
				}
			} catch(e) {
			}
		}, 1000)
	}
})

Events.on('spawn', function(spawn) {
	var $div = document.createElement('div')
	var $tile = document.createElement('div')
	$tile.setAttribute('class', 'tile '+'tile-'+spawn.row+'-'+spawn.col+' tile-phase-'+(spawn.color-1))
	$div.setAttribute('class', 'tile-inner')
	$tile.appendChild($div)
	$grid.appendChild($tile)
})

var maxColor = 1
Events.on('setColor', function(elem) {
	var $tiles = $('.tile-'+elem.row+'-'+elem.col)
	try {
		for(var i=0;i<$tiles.length;i++) {
			$tiles[i].className = $tiles[i].className.replace(/tile-phase-\d/, 'tile-phase-'+(elem.color-1))
		}

		if (elem.color > maxColor) {
			maxColor = elem.color
			$progress = $('#progress-cover')[0]
			$progress.className = $progress.className.replace(/progress-\d/, 'progress-'+(maxColor-1))
		}
	} catch (e) {}
})

// super hack to prevent multiple buttons spawning end of game
var gameOverOnce = false
var postedScore = false
var postingScore = false
Events.on('gameOver', function() {
	postedScore = false
	postingScore = false
	maxColor = 0
	var $infoScreen = document.getElementById('info-screen')
	$infoScreen.className = 'show'
	$infoScreen.style.display = 'table'

	var $gameOverBox = document.getElementById('game-over-box')
	$gameOverBox.style.display = 'block'

	var $challengeButton = document.createElement('button')
	$challengeButton.innerHTML = 'Challenge a Friend'
	// Should add some sort of fastclick here... (touch first)
	$challengeButton.addEventListener('click', function() {
		Events.emit('challengeFriend')
	})

	// move the score element inside this div, we move back to it's original spot when a new game is started
	var $scoreWrapperEle = $('.bubble-wrapper')[0]
	if($scoreWrapperEle) {
		$scoreWrapperEle.style.zIndex = 10 // show above game over box. we want it below the tutorial tips at start though
		$gameOverBox.appendChild($scoreWrapperEle)
	}

	var $shareBubble = $('.share-bubble')[0]
	if($shareBubble)
		$shareBubble.style.display = 'none'

	Events.on('showHighScores', function() {
		GAME.leaderboard.show({}, function() { postingScore = false });
	})

	if (!gameOverOnce) {
		var $gameOverButton = document.createElement('button')
		$gameOverButton.innerHTML = 'Play Again'
		$gameOverButton.className = 'play-again'
		// Should add some sort of fastclick here... (touch first)
		$gameOverButton.addEventListener('click', function() {
			Events.emit('restartGame')
		})

		$gameOverBox.appendChild($challengeButton)

		$gameOverBox.appendChild($gameOverButton)


		if (GAME.leaderboard) {
			var $leaderboardButton = document.createElement('button')
			$leaderboardButton.innerHTML = 'Leaderboard'
			$leaderboardButton.className = 'leaderboard-button'

			// Should add some sort of fastclick here... (touch first)
			$leaderboardButton.addEventListener('click', function() {
				if (GAME.leaderboard && !postingScore) {
					postingScore = true // set to false in showHighScores event
					if (!postedScore) {
						$leaderboardButton.innerHTML = 'Posting...'

						var postErrorTimeout = setTimeout(function () {
							$leaderboardButton.innerHTML = 'Leaderboard'
							postedScore = true
							Events.emit('showHighScores')
						}, 1000)

						GAME.leaderboard.post({
							score: GAME.board.score
						}, function() {
							window.clearTimeout(postErrorTimeout)
							$leaderboardButton.innerHTML = 'Leaderboard'
							postedScore = true
							Events.emit('showHighScores')
						})
					} else {
						Events.emit('showHighScores')
					}
				}
			})
			$gameOverBox.appendChild($leaderboardButton)
		}


		gameOverOnce = true
	}

	// move the score element inside this div, we move back to it's original spot when a new game is started
	var $scoreWrapperEle = $('.bubble-wrapper')[0]
	if($scoreWrapperEle)
		$gameOverBox.appendChild($scoreWrapperEle)

	// Reset saved game
	delete localStorage['grid']
	delete localStorage['score']
})

Events.on('challengeFriend', function() {
	var score = GAME.board.score;
	Clay.client({
		method: 'kik.isEnabled'
	})
	.then(function (enabled) {
		if (enabled) {
			return Clay.client({
				method: 'kik.send',
				params: [{
					text: 'I just scored ' + score + ' in Prism! Think you can beat my score?',
					title: 'Prism',
					data: {
						gameKey: 'prism'
					}
				}]
			})
		}
	})
	.then(null, function (err) {
		Clay.Social.smartShare({
			message: 'I just scored ' + score + ' in Prism! Think you can beat my score?',
			title: 'Prism',
			link: 'http://prism.clay.io',
			//image: screenshotURL,
			ignoreScreenshot: true,
			data: {},
			//respond: // the username of our opponent // cards.kik.returnToConversation
		})
	})
})

Events.on('restartGame', function() {
	$('.grid')[0].innerHTML = ''
	document.getElementById('progress-cover').className = 'progress-0'
	document.getElementById('info-screen').className = 'hide'

	// move the score element back to where it was before
	var $scoreWrapperEle = $('.bubble-wrapper')[0]
	if($scoreWrapperEle)
		document.body.appendChild($scoreWrapperEle)

	var $shareBubble = $('.share-bubble')[0]
	if($shareBubble)
		$shareBubble.style.display = 'inline-block'

	GAME.board.newGame()
})

$scoreEle = $('#score')[0]
Events.on('score', function(score) {
	$scoreEle.innerHTML = score;
})

// keybindings
var move = 'left';
Hammer(window, {
	drag_min_distance:5,
	drag_block_horizontal:true,
	drag_block_vertical:true
}).on("dragleft", function(e) {
	e.preventDefault()
	e.gesture.preventDefault()
	move='left'
}).on("dragright", function(e) {
	e.preventDefault()
	e.gesture.preventDefault()
	move='right'
}).on("dragup", function(e) {
	e.preventDefault()
	e.gesture.preventDefault()
	move='up'
}).on("dragdown", function(e) {
	e.preventDefault()
	e.gesture.preventDefault()
	move='down'
}).on('dragend', function(e) {
	GAME.board.move(move)
})

Mousetrap.bind(['up', 'down', 'left', 'right'], function(e) {
	e.preventDefault()
	var key = e.keyIdentifier
	if(!key) { // firefox
		switch(e.which) {
			case 40:
				key = 'Down';
				break;
			case 39:
				key = 'Right';
				break;
			case 37:
				key = 'Left';
				break;
			case 38:
				key = 'Up';
				break;
		}
	}
	GAME.board.move(key.toLowerCase())
});

// init
// Run the tutorial for first-time visitors
if (!localStorage['tutorial-shown']) {

	// row, col, color
	GAME.board.newGame([[2,1,1],[2,2,1]])
	GAME.tutorial = new Tutorial([2, 1])
	localStorage['tutorial-shown'] = 1
} else if (localStorage['grid']) { // for persistence
	var grid = JSON.parse(localStorage['grid'])
	var startingPositions = []
	for(var r=0;r<4;r++) {
		for(var c=0;c<4;c++) {
			if(grid[r][c] > 0)
				startingPositions.push([r, c, grid[r][c]])
		}
	}
	GAME.board.newGame(startingPositions)
	GAME.board.score = parseInt(localStorage['score']) || 0
	Events.emit('score', GAME.board.score)
} else {
	GAME.board.newGame()
}

window.addEventListener('load', function() {
	scrollTo( 0, 1 );

	// Load clay API
	var Clay = window.Clay = window.Clay || {};
	Clay.gameKey = "prism";
	Clay.readyFunctions = [];
	Clay.ready = function( fn ) {
		Clay.readyFunctions.push( fn );
	};
	( function() {
		var clay = document.createElement("script"); clay.async = true;
		//clay.src = ( "https:" == document.location.protocol ? "https://" : "http://" ) + "clay.io/api/api.js";
		clay.src = "http://cdn.clay.io/api.js";
		//clay.src = "http://clay.io/api/src/bundle.js";
		var tag = document.getElementsByTagName("script")[0]; tag.parentNode.insertBefore(clay, tag);
	} )();

	// Ghetto load an ad
	// Just took the coffeescript -> js from mobile.coffee... not super clean
	var adLoaded = function(response) {
		var ad, devicePixelRatio, e, image, obj;

		try {
		  obj = JSON.parse(response);
		} catch (_error) {
		  e = _error
		  obj = {}
		  return
		}

		ad = document.createElement('a')
		ad.className = 'ad'
		devicePixelRatio = window.devicePixelRatio || 1
		image = document.createElement('img')
		ad.href = '#'

		if (devicePixelRatio > 1) {
		  image.src = obj.srcRetina
		} else {
		  image.src = obj.src
		}

		if (typeof _gaq !== 'undefined') {
		  _gaq.push(['_trackEvent', 'Cross Promotion 320x50', obj.href, 'Ad View']);
		}

		ad.addEventListener('touchstart', function(e) {
		  if (e) {
		    e.preventDefault()
		  }
		  if (typeof _gaq !== 'undefined') {
		    _gaq.push(['_trackEvent', 'Cross Promotion 320x50', obj.href, 'Ad Click'])
		    return _gaq.push(function() {
		      return window.location.href = obj.href
		    })
		  } else {
		    return window.location.href = obj.href
		  }
		})

		image.width = 320 * devicePixelRatio
		image.height = 50 * devicePixelRatio
		image.style.width = '320px'
		image.style.height = '50px'

		ad.appendChild(image)
		document.body.appendChild(ad)
	}

	var objToParams = function(obj) {
	  var p, url;
	  url = []
	  for (p in obj) {
	    if (obj.hasOwnProperty(p)) {
	      url.push(p + "=" + encodeURIComponent(obj[p]))
	    }
	  }
	  return url.join("&")
	}
	var ajax = function(url, options, callback) {
	  var request, update, xhr;
	  if (options == null) {
	    options = {}
	  }
	  if (callback == null) {
	    callback = false
	  }
	  if (typeof options === 'function') {
	    callback = options
	    options = {}
	  }
	  if ('withCredentials' in new XMLHttpRequest()) {
	    request = XMLHttpRequest
	    update = function() {
	      if (xhr.readyState === 4) {
	        return callback(xhr.responseText)
	      }
	    }
	    xhr = new request()
	    xhr.open("POST", url, true)
	    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
	    xhr.onreadystatechange = update
	    return xhr.send(objToParams(options))
	  }
	}

	// Load GA
	;(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
	})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

	ga('create', 'UA-27992080-1', 'clay.io');
	ga('send', 'pageview');

	// high score
	Clay.ready(function() {
		console.log('Clay loaded')

		// Detect old android and toss a class on <body> to use less animations
		if(Clay.Environment.os == 'android' && Clay.Environment.version < 3) {
			document.body.className = 'slow'
		}

		if(navigator.onLine)
			GAME.leaderboard = new Clay.Leaderboard({id: 3487})
	})

	// New Clay SDK
	var Clay = window.Clay
	Clay.init({gameId: 4875, debug: true})
	.then(function () {
		return Clay.client({method: 'kik.isEnabled'})
	})
	.then(function (isEnabled) {
		if (isEnabled) {
			Clay.client({
				method: 'kik.browser.setOrientationLock',
				params: ['portrait']
			})
			.then(null, function (err) {
				console.error(err)
			})

			// track messages sent
			Clay.client({method: 'kik.metrics.enableGoogleAnalytics'})
			.then(null, function (err) {
				console.error(err)
			})

			// ghetto-load ad
			ajax( 'http://api.clay.io/ad/' + Clay.gameKey, adLoaded )

			var $brand = $('.brand')[0]
			$brand.style.display = 'none'

			var $shareBubble = document.getElementById('share')

			var $share = document.createElement('a')
			$share.className = 'kik-share'
			$share.href = '#'
			$share.id = 'kik-share'
			$share.innerHTML = "<img src='images/kik-it.png'><span>share!</span></a>"
			//$shareBubble.addEventListener('touchstart', GAME.share)
			$shareBubble.addEventListener('click', GAME.share)
			$shareBubble.appendChild($share)

		} else {
			throw new Error('always')
		}
	})
	.then(null, function (err) {
		var html = '<iframe src="//www.facebook.com/plugins/like.php?href=http%3A%2F%2Fprism.clay.io&amp;send=false&amp;layout=button_count&amp;width=100&amp;show_faces=false&amp;action=like&amp;colorscheme=light&amp;font&amp;height=21&amp;appId=405599259465424" style="border:none; overflow:hidden; width: 90px; height:21px;"></iframe>'
		html += '<iframe allowtransparency="true" frameborder="0" scrolling="no" src="https://platform.twitter.com/widgets/tweet_button.html?url=http://prism.clay.io&via=claydotio&text=Prism%20-%202048%20without%20numbers" style="width:85px; height:20px;"></iframe>'
		document.getElementById('share').innerHTML = html

		var html = ''
		html += "<a href='http://clay.io' target='_blank'><img src='http://clay.io/images/full-logo-dark-150.png'></a>"
		html += "<div>"
		html += "	<a href='http://clay.io/development-tools' target='_blank'>We &hearts; HTML5 Games</a>"
		html += "	&middot; <a href='mailto:contact@clay.io'>contact@clay.io</a>"
		html += "</div>"
		document.getElementById('brand').innerHTML = html
	})


	// webkit-clip: text doesn't work on older android, so the logo, etc.. looks screwy
	var $gameOverText = document.getElementById('game-over-text')
	var supportsWebkitBackgroundClipText = typeof $gameOverText.style.webkitBackgroundClip !== "undefined" && ( $gameOverText.style.webkitBackgroundClip = "text", $gameOverText.style.webkitBackgroundClip === "text" )
	var gameOverTextStyle = window.getComputedStyle($gameOverText)
	var supportsLinearGradient = gameOverTextStyle.getPropertyValue('background').indexOf('linear-gradient') !== -1
	if(!supportsWebkitBackgroundClipText || !supportsLinearGradient) {
		$gameOverText.style.background = 'transparent'
		$gameOverText.style.webkitTextFillColor = '#000'
		var $logoText = document.getElementById('logo-text')
		$logoText.style.background = 'transparent'
		$logoText.style.webkitTextFillColor = '#000'
	}
})

function sizing() {
	var gridWidth = window.innerWidth
	var gridHeight = window.innerHeight - $('.grid-inner')[0].offsetTop * 2 // .grid-outer padding
	var boxSize = Math.min(gridWidth, gridHeight) * 0.94 // 3% css padding
	$('.grid-background')[0].style.width = boxSize + 'px'
	$('.grid-background')[0].style.height = (boxSize - 14) + 'px' // 7px  padding
}
sizing()
$grid.style.visibility = 'visible'
$('.grid-background')[0].style.visibility = 'visible'
window.onresize = sizing
