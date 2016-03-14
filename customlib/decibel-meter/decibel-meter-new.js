
var DecibelMeter = ( function ( window, navigator, document, undefined ) {
	
	// user media
	

	console.log(navigator.mediaDevices);

	//navigator.getUserMedia = navigator.mediaDevices.getUserMedia;

	if (!navigator.getUserMedia)
		navigator.getUserMedia = navigator.webkitGetUserMedia
								|| navigator.mozGetUserMedia
								|| navigator.msGetUserMedia;
	
	if (!navigator.getUserMedia) {
		throw new Error('DecibelMeter: getUserMedia not supported');
		return undefined;
	}
	
	
	// audio context
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	
	if (!window.AudioContext) {
		throw new Error('DecibelMeter: AudioContext not supported');
		return undefined;
	}
	
	
	// audio sources
	
	if (!window.MediaStreamTrack) {
		throw new Error('DecibelMeter: MediaStreamTrack not supported');
		return undefined;
	}
	

	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
  console.log("enumerateDevices() not supported.");
  return;
}
	
	var sources = [],
		sourcesIndex = {},
		sourcesReady = false;
	
	navigator.mediaDevices.enumerateDevices().then(function (srcs) {
		console.log('enumerateDevices');
		console.log(srcs);
		srcs.forEach( function (source) {
			if (source.kind === 'audioinput') {
				sources.push(source);
				sourcesIndex[source.id] = source;
			}
		});
		
		sourcesReady = true;
		
		// let meters know that audio sources are ready now
		
		meters.forEach(function (meter) {
			dispatch(meter, 'ready', [meter, sources]);
		});
	});
	
	
	// util
	
	function connectTo(source, meter, callback) {
		
		var oldSource = meter.source,
			changing = oldSource !== null,
			constraints = { audio: { optional: [{sourceId: source.id}] } };	
		
		meter.source = source;
		
		function success(stream) {
			var connection = {};
			
			connection.stream = stream;
			connection.context = new AudioContext();
			connection.source = connection.context.createMediaStreamSource(stream);
			connection.analyser = connection.context.createAnalyser();
			connection.analyser.smoothingTimeConstant = .5;
			connection.analyser.frequencyBinCount = 16;
			connection.lastSample = new Uint8Array(1);
			
			meter.connection = connection;
			meter.connected = true;
			
			if (callback)
				callback.call(meter, meter, source);
		
			if (changing && meter.handle.sourceChange)
				dispatch(meter, 'source-change', [source, oldSource, meter]);
			
			if (meter.handle.connect)
				dispatch(meter, 'connect', [meter, source]);
		}
		
		function error(response) {
			console.log(response);
			alert(response);
		}
		
		navigator.getUserMedia(constraints, success, error);
	}
	
	function dispatch(meter, eventName, params) {
		var h = meter.handle[eventName],
			n = h.length;
		
		if (n === 0) return;
		
		var i = 0;
		
		for (; i < n; i++)
			if (true === h[i].apply(meter, params))
				break;
	}
	
	// class
	
	function DecibelMeter(id, opts) {
		this.id = id;
		this.opts = opts;
		this.source = null;
		this.listening = false;
		this.connection = null;
		this.connected = false;
		this.handle = {
			ready: 				opts.ready ? [opts.ready] : [],
			sample: 			opts.sample ? [opts.sample] : [],
			connect: 			opts.connect ? [opts.connect] : [],
			disconnect: 		opts.disconnect ? [opts.disconnect] : [],
			"source-change":	opts.sourceChange ? [opts.sourceChange] : [],
			listen: 			opts.listen ? [opts.listen] : [],
			"stop-listening": 	opts.stopListeing ? [opts.stopListening] : []
		};
		
		this.startLoop();
	}
	
	DecibelMeter.prototype.getSources = function () {
		return sources;
	};
	
	DecibelMeter.prototype.connect = function (source, callback) {
		
		if (!sourcesReady)
			throw new Error('DecibelMeter: Audio sources not ready');
		
		if (!source)
			throw new Error('DecibelMeter: No audio source specified');
		
		if (typeof source === 'string' || typeof source === 'number') {
			
			source = sourcesIndex[source];
			
			if (!source)
				throw new Error('DecibelMeter: Attempted to select invalid audio source');
		}
		
		if (this.source === source) return; // already connected to this source
		
		connectTo(source, this, callback);
		return this;
	};
	
	DecibelMeter.prototype.disconnect = function () {
		if (this.connection === null) return this;
		
		this.stopListening();
		this.connection.stream.stop();
		this.connection.stream = null;
		this.connection = null;
		this.source = null;
		this.connected = false;
		
		dispatch(this, 'disconnect', [this]);
		
		return this;
	};
	
	DecibelMeter.prototype.listen = function () {
		if (this.listening) return;
		
		if (this.source === null)
			throw new Error('DecibelMeter: No source selected');
		
		if (this.connection === null)
			throw new Error('DecibelMeter: Not connected to source');
		
		this.connection.source.connect(this.connection.analyser);
		this.listening = true;
		
		dispatch(this, 'listen', [this]);
	};
	
	DecibelMeter.prototype.stopListening = function () {
		if (!this.listening) return;
		
		if (this.source === null)
			throw new Error('DecibelMeter: No source selected');
		
		if (this.connection === null)
			throw new Error('DecibelMeter: Not connected to source');
		
		this.connection.source.disconnect(this.connection.analyser);
		this.listening = false;
		
		dispatch(this, 'stop-listening', [this]);
	};
	
	DecibelMeter.prototype.startLoop = function () {
		
		var meter = this;
		
		function update() {
			
			if (meter.listening && meter.handle.sample) {
				

				/*
				meter.connection.analyser.getByteFrequencyData(meter.connection.lastSample);

				var value = meter.connection.lastSample[0],
					percent = value / 255,
					dB = meter.connection.analyser.minDecibels
						+ ((meter.connection.analyser.maxDecibels - meter.connection.analyser.minDecibels) * percent);

				console.log(20 * Math.log10(
					((meter.connection.analyser.maxDecibels - meter.connection.analyser.minDecibels) * percent) / meter.connection.analyser.minDecibels));

				*/

				/* note that getFloatTimeDomainData will be available in the near future,
			   * if needed. */

			 // meter.connection.analyser.getFloatFrequencyData(meter.connection.lastSample);
			 // console.log(meter.connection.lastSample);


			  meter.connection.analyser.getByteTimeDomainData(meter.connection.lastSample);

			 // console.log(meter.connection.analyser.getFloatFrequencyData(meter.connection.lastSample));
			  /* RMS stands for Root Mean Square, basically the root square of the
			  * average of the square of each value. */
			  var rms = 0;
			  console.log(meter.connection.lastSample.length);
			  for (var i = 0; i < meter.connection.lastSample.length; i++) {
			    rms += meter.connection.lastSample[i] * meter.connection.lastSample[i];
			  }
			  //rms /= meter.connection.lastSample.length;

			  rms = Math.sqrt(rms / meter.connection.lastSample.length);

			  //var potentialDb = rms / 600; //16384
			  console.log(rms);

			  //16384
			  //var mGain = 2500.0 / Math.pow(10.0, 90.0 / 20.0);
			  var mGain = 128 / Math.pow(10.0, 31.0 / 20.0);
			  var potentialDb = 20.0 * Math.log10(mGain * rms);

			  //potentialDb =  45 + (potentialDb - 42) * 10;

			  //rms = Math.sqrt(rms);

			  var percent = 0;
			  var value = 0;
			  var dB = rms;

			  //var dB = 20 * Math.log10(rms); 
				dispatch(meter, 'sample', [potentialDb, percent, value]);
			}
			
			requestAnimationFrame(update);
		}
		
		update();
	};
	
	DecibelMeter.prototype.on = function (eventName, handler) {
		if (this.handle[eventName] === undefined) return this;
		this.handle[eventName].push(handler);
		return this;
	};
	// api
	
	var meters = [],
		metersIndex = {};
	
	return {
		create: function (id, opts) {
			id = id || ['db', new Date().getTime(), Math.random()].join('-');
			var meter = new DecibelMeter(id, opts || {});
			metersIndex[id] = meter;
			meters.push(meter);
			return meter;
		},
		
		getMeterById: function (id) {
			return metersIndex[id] || null;
		},
		
		getMeters: function () {
			return meters;
		}
	};			
	
})( window, navigator, document );