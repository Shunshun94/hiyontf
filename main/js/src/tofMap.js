var com = com || {};
com.hiyoko = com.hiyoko || {};
com.hiyoko.tofclient = com.hiyoko.tofclient || {};
com.hiyoko.tofclient.Map = function(tof, interval, options){
	var isDrag = options.isDraggable ? true : false;
	var debugMode = options.debug;
	var $html = options.html ? options.html : $("#tofChat-map");
	
	var $disp = $("#tofChat-map-display");
	var $reset = $("#tofChat-map-reset");
	var $reload = $("#tofChat-map-reload");
	var $update = $("#tofChat-map-lastupdate");
	var $switchChar = $("#tofChat-map-char-switch");
	var $switchLine = $("#tofChat-map-line-switch");

	var mapWriter = new com.hiyoko.tofclient.Map.MapWriter($disp, tof, isDrag, debugMode);

	function isActive() {
		return $html.css('display') !== 'none';
	}
	
	this.init = function(){

		$reload.click(function(e){
			mapWriter.rewriteCharacters();
		});
		$disp.on("moveCharacter", function(e){
			e.obj.move(e.x, e.y);
		});
		$switchChar.click(function(e){
			mapWriter.toggleName();
		});
		
		$switchLine.click(function(e){
			mapWriter.toggleLine();
		});
		
		$reset.click(function(e){
			mapWriter.rewriteMap();
		});
		
		if(interval){
			window.setInterval(function(){
				if(isActive()){
					$reload.click();
				}
			}, interval);
		}
		
		// 少し時間をおいてロードしないと横幅がうまくとれない
		window.setTimeout(function(){
			try{
				$reset.click();
			} catch(e) {
				alert(e);
			}
		}, 100);
		
	};

	this.init();

};

com.hiyoko.tofclient.Map.MapWriter = function($disp, tof, opt_dragMode, opt_debugMode){
	var isDrag = opt_dragMode ? true : false;
	var debugMode = opt_debugMode;
	var tofUrl = tof.getStatus().url;
	var self = this;
	var boxSize = Math.floor($disp.parent().parent().width()  / (20)) - 1;
	var $status = $("#tofChat-map-status");
	var $update = $("#tofChat-map-lastupdate");
	
	var debugLog = debugMode ? function(str){alert(str)} : function(str){};
	
	this.toggleName = function() {
		$('.tofChat-map-char-name').toggle();
	};
	
	this.toggleLine = function() {
		var $box = $('.tofChat-map-box');
		if($box.hasClass('tofChat-map-box-lined')) {
			$('.tofChat-map-box').removeClass('tofChat-map-box-lined');
			$('.tofChat-map-box').css('width', ((Number($('.tofChat-map-box').css('width').replace('px','')) + 2)+'px'));
			$('.tofChat-map-box').css('height', ((Number($('.tofChat-map-box').css('height').replace('px','')) + 2)+'px'));
		} else {
			$('.tofChat-map-box').addClass('tofChat-map-box-lined');
			$('.tofChat-map-box').css('width', ((Number($('.tofChat-map-box').css('width').replace('px','')) - 2)+'px'));
			$('.tofChat-map-box').css('height', ((Number($('.tofChat-map-box').css('height').replace('px','')) - 2)+'px'));
		}		
	}
	
	this.displaySwitch = function(){
		this.toggleName();
		this.toggleLine();
	};

	this.rewriteMap = function(){
		tof.getRefresh(rewriteMapAll_,true, true);
	};

	this.rewriteCharacters = function(){
		tof.getRefresh(rerendCharacters_,true);
	};

	function parseUrl(picUrl){
		if(startsWith(picUrl, "http")){
			return picUrl;
		}
		if(startsWith(picUrl, "../") || startsWith(picUrl, "/")){
			return tofUrl.replace("DodontoFServer.rb?", picUrl);				
		}
		if(startsWith(picUrl, "./")){
			return tofUrl.replace("DodontoFServer.rb?", picUrl.substring(1));		
		}
		return tofUrl.replace("DodontoFServer.rb?", "/" + picUrl);
	}

	function rewriteMapAll_(result){
		try{		
			var urlParser = com.hiyoko.tofclient.Map.getPicUrl;
			var chars = result.characters;
			boxSize = Math.floor($disp.parent().parent().width()  / (result.mapData.xMax)) - 1;
			debugLog("Map tile size = " + boxSize + "\nMap Width = " + $disp.parent().parent().width());
			clearMap();
			drawMap(result);
	
	
			$(".tofChat-map-box").css("width", boxSize + "px");
			$(".tofChat-map-box").css("height", boxSize + "px");
	
			rendCharacters(chars, boxSize);
		} catch (e) {
			alert("ERROR @Shunshun94 にこの文字列 (ないし画面) を送ってください\n" + e.stack);
		}
	}

	function clearMap(){
		$disp.empty();
	}

	function drawMap(data){
		var mapData = data.mapData;
		var backgroundColors = mapData.mapMarks;
		var $map = $("<div id='tofChat-map-map'></div>");

		rendFloorTiles(data.characters, $map);
		if(backgroundColors && backgroundColors.length !== 0){
			$.each(backgroundColors, function(ia, boxs){
				var $tr = $("<div class='tofChat-map-line'></div>");
				$.each(boxs, function(ib, box){
					var $sq = $("<div class='tofChat-map-box'></div>");
					$sq.css("background-color", intToColor(box));
					$tr.append($sq);
				});
				$map.append($tr);
			});
		} else {
			for(var i = 0; i < mapData.yMax; i++) {
				var $tr = $("<div class='tofChat-map-line'></div>");
				for(var j = 0; j < mapData.xMax; j++) {
					var $sq = $("<div class='tofChat-map-box'></div>");
					$tr.append($sq);					
				}
				$map.append($tr);
			}
		}
		$disp.append($map);
		$(".tofChat-map-box").css("opacity", mapData.mapMarksAlpha);
		$("#tofChat-map-map").css("background-image",
				"url('" + parseUrl(mapData.imageSource) + "')");
	}

	function clearCharacters(){
		$(".tofChat-map-char").remove();
	}

	function rerendCharacters_(result){
		clearCharacters();
		rendCharacters(result.characters);
	};

	function rendFloorTiles(tiles, opt_parent, opt_size) {
		var $tag = opt_parent ? opt_parent : $("#tofChat-map-map");
		var size = opt_size ? opt_size : boxSize;
		$.each(tiles, function(ind, tile){
			if(tile.type === "floorTile"){
				$tag.append(rendTile(tile, size));
			}
		});
	}

	function rendTile(tile, opt_size){
		var size = opt_size || boxSize;
		var $tile = $("<div class='tofChat-map-tile'></div>");
		$tile.css("position", "absolute");
		$tile.css("width", (tile.width * (size) - 2) + "px");
		$tile.css("height", (tile.height * (size) - 2) + "px");

		$tile.css("top", (1 + tile.y * (size)) + "px");
		$tile.css("left", (1 + tile.x * (size)) + "px");
		$tile.css("background-image",
				"url('" + parseUrl(tile.imageUrl, tofUrl) + "')");
		return $tile;
	};

	function rendCharacters(chars, opt_size){
		var size = opt_size ? opt_size : boxSize;
		var charList = {};
		$.each(chars, function(ind, char){
			if(char.type === "characterData"){
				charList[char.name] = tof.generateCharacterFromResult(char);
				charList[char.name].x = char.x;
				charList[char.name].y = char.y;
				charList[char.name].elem = rendCharacter(char, size);
				$("#tofChat-map-map").append(charList[char.name].elem);
			}
		});

		if(isDrag){
			$(".tofChat-map-char").pep({
				constrainTo: 'parent',
				shouldEase: false,
				start: function(ev, obj){
					$status.text(this.$el.text());
				},
				stop: function(ev, obj){
					$status.text("");
					if(this.$el.hasClass("tofChat-map-char-pop-triger")){
						this.$el.removeClass("tofChat-map-char-pop-triger");
						return;
					}
					var $tag = this.$el;
					var pos = $tag.position();
					var half = size / 2;
					var posY = Math.floor((half + pos.top)  / (size));
					var posX = Math.floor((half + pos.left) / (size));
					var event = new $.Event("moveCharacter",
							{obj:charList[this.$el.text()],
							 x: posX, y: posY});
					$tag.trigger(event);
					$tag.removeClass("tofChat-map-char-pop");
					placeCharacter(posX, posY, $tag, size);
					charList[$tag.text()].x = posX;
					charList[$tag.text()].y = posY;
					closeSamePlaceCharacters(charList);
				}
			});
			$(".tofChat-map-char").mousedown(function(e){
				var samePlaceList = [];
				var target = charList[$(e.target).text()];
				var x = target.x;
				var y = target.y;
				for(key in charList) {
					if(charList[key].x === x && charList[key].y === y){
						samePlaceList.push(charList[key]);
					}
				}
				if(samePlaceList.length === 1 || $(e.target).hasClass("tofChat-map-char-pop")){
					return;
				}
				$(e.target).addClass("tofChat-map-char-pop-triger");
				openSamePlaceCharacters(samePlaceList);
			});
		}
		
		var now = new Date();
		$update.text('Map Last Update： ' + now.getHours() + '：' + now.getMinutes() + '：' + now.getSeconds());
	}
	
	function placeCharacter(x, y, $tag, opt_scale){
		var size = opt_scale || boxSize;
		var realX = (1 + x * (size)) - Number($tag.css("left").replace("px", ""));
		var realY = (1 + y * (size)) - Number($tag.css("top").replace("px", ""));
		
		$tag.css("transform", "matrix(1, 0, 0, 1," + realX + "," + realY +")");
	}
	
	function openSamePlaceCharacters(charList){
		$.each(charList, function(i, char){
			char.elem.addClass("tofChat-map-char-pop");
			placeCharacter(char.x, char.y + i, char.elem);
		});
	}
	
	function closeSamePlaceCharacters(charList){
		$.each($(".tofChat-map-char-pop"),function(i, elem){
			var $elem = $(elem);
			var char = charList[$elem.text()];
			$elem.removeClass("tofChat-map-char-pop");
			placeCharacter(char.x, char.y, $elem);
		});
	}
	
	function rendCharacter(char, opt_size){
		var size = opt_size || boxSize;
		var $char = $("<div class='tofChat-map-char'></div>");
		var $name = $("<div class='tofChat-map-char-name' style='height:"+(char.size * (size) - 2)+"px'></div>");
		$name.text(char.name);
		
		$char.css("width", (char.size * (size) - 2) + "px");
		$char.css("height", (char.size * (size) - 2) + "px");

		$char.css("top", (1 + char.y * (size)) + "px");
		$char.css("left", (1 + char.x * (size)) + "px");
		$char.css("background-image",
				"url('" + parseUrl(char.imageName, tofUrl) + "')");
		$char.append($name);
		return $char;
	}
};
