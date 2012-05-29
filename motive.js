////////////////////////////////////////////////////////////////////
///////////////// Global functions
////////////////////////////////////////////////////////////////////

// function log(){
// 	if( typeof console != 'undefined' ){
// 		console.log.apply(this, arguments);
// 	}
// }

function exists(thing){
	return typeof thing != 'undefined';
}

function blank(string){
	return typeof string == 'string' && string.length > 0;
}

////////////////////////////////////////////////////////////////////
///////////////// Motive IS JUST THE VIEW LOGIC
////////////////////////////////////////////////////////////////////

function Motive(){
	// Presentation Model 
	this.data 				= {};
	this.dataBindings 		= {};
	// Components
	this.references 		= {};
	// Layouts
	this.templates			= {};
	this.templateSpecs 		= {};
	// Behaviors
	this.actions			= {};
	// Utility
	this.$ 					= jQuery || Zepto; // TODO: externalize
}

Motive.prototype.watch = function(target, prop, handler){
	if( target.__lookupGetter__(prop) != null ){
		return true;
	}
	var oldval = target[prop], newval = oldval,
	self = this,
	getter = function () {
		return newval;
	},
	setter = function (val) {
		if( self.$.isArray(val) ){
			val = self._extendArray(val, handler, self);
		}
		oldval = newval;
		newval = val;
		handler.call(target, prop, oldval, val, self);
	};
	if (delete target[prop]) { // can't watch constants
		if (Object.defineProperty) { // ECMAScript 5
			Object.defineProperty(target, prop, {
				get: getter,
				set: setter,
				enumerable: false,
				configurable: true
			});
		} else if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) { // legacy
			Object.prototype.__defineGetter__.call(target, prop, getter);
			Object.prototype.__defineSetter__.call(target, prop, setter);
		}
	}
	return this;
};

Motive.prototype.unwatch = function(target, prop){
	var val = target[prop];
	delete target[prop]; // remove accessors
	target[prop] = val;
	return this;
};

Motive.prototype._generateNotifyFunction = function(dataName){
	var notifyFunction = function(propName, oldValue, newValue, self){
		for( var i = 0; i < self.dataBindings[dataName].length; i++ ){
			self.dataBindings[dataName][i](propName, oldValue, newValue, self);
		}
	};
	return notifyFunction;
}

// dynamize a variable
Motive.prototype.manage = function(dataName, initialValue){
	if( typeof dataName == 'string' && this.data.__lookupGetter__(dataName) == undefined ){
		this.data[dataName] 		= initialValue;
		this.dataBindings[dataName] = [];
		this.watch( this.data, dataName, this._generateNotifyFunction(dataName) );
	}
	return this;
};

// wire a setter function to a variable's value change
Motive.prototype.bind = function(dataName, callback){
	if( !this.data.hasOwnProperty(dataName) ){
		this.manage(dataName);
	}
	if( callback ){
		this.dataBindings[dataName].push(callback);
	}
	return this;
};

// acquire a reference to the given element in the page
Motive.prototype.reference = function(name, selector){
	var self = this;
	this.references.__defineGetter__(name, function(){
		return self.$(selector);
	});
	this.references[name].selector = selector;
	return this;
}

// wire redraws of a template into a component reference when the data changes
Motive.prototype.template = function(componentName, dataName, template, engine){
	// todo support selectors instead of named keys into references
	// for the component name
	// template 				= '{{#data}}'+template+'{{/data}}';
	var component 			= this.references[componentName],
		compiledTemplate 	= engine.compile(template),
		templateSpec = {
			componentName: componentName,
			component: component,
			dataName: dataName,
			template: template,
			engine: engine,
			compiledTemplate: compiledTemplate,
			redrawFunction: function(propertyName, oldValue, newValue){
				if( typeof compiledTemplate == 'function' ){
					component.html(compiledTemplate({ data: newValue }));
				}else{
					component.html(compiledTemplate.render({ data: newValue }));
				}
			} 
		};
	this.templateSpecs[componentName] = templateSpec;
	this.bind(dataName, templateSpec.redrawFunction);
	return this;
}

// wire up an action
Motive.prototype.action = function(componentName, eventName, callback){
	var self = this;
	var selector = typeof this.references[componentName] != 'undefined' 
					? this.references[componentName].selector : componentName;
	this.$('body').on(eventName, selector, function(event){
		if( callback ){
			callback.call(self, self.$(event.currentTarget), event);
		}
	});
	return this;
};

Motive.prototype._generateWrapperFunction = function(fn){
	var self = this;
	return function(){
		return fn.apply(self,arguments);
	}
};

Motive.prototype._generatePropertyValue = function(extension){
	var type = typeof extension,
		value;
	// console.log('got extension: ', type, extension);
	switch(type){
		case 'function':
			value = this._generateWrapperFunction(extension);
			break;
		case 'number':
		case 'string':
		case 'boolean':
			value = extension;
			break;
		case 'object':
			value = {};
			for( var key in extension ){
				value[key] = this._generatePropertyValue(extension[key]);
			}
			break;
	}
	return value;
};

// tack on functions to a motive instance
Motive.prototype.extend = function(extensions){
	for( var primaryKey in extensions ){
		this[primaryKey] = this._generatePropertyValue(extensions[primaryKey]);
	}
	return this;
};

// Allows operations performed on an array instance to trigger bindings
Motive.prototype._extendArray = function(arr, callback, motive){
	if (arr.__wasExtended === true) return;

	function generateOverloadedFunction(target, methodName, self){
		return function(){
			var oldValue = Array.prototype.concat.apply(arr);
			Array.prototype[methodName].apply(target, arguments);
			target.updated(oldValue, motive);
		};
	} 
	arr.updated = function(oldValue, self){
		callback.call(this, 'items', oldValue, this, motive);
	};
	arr.concat 	= generateOverloadedFunction(arr, 'concat', motive);
	arr.join	= generateOverloadedFunction(arr, 'join', motive);
	arr.pop 	= generateOverloadedFunction(arr, 'pop', motive);
	arr.push 	= generateOverloadedFunction(arr, 'push', motive);
	arr.reverse = generateOverloadedFunction(arr, 'reverse', motive);
	arr.shift 	= generateOverloadedFunction(arr, 'shift', motive);
	arr.slice 	= generateOverloadedFunction(arr, 'slice', motive);
	arr.sort 	= generateOverloadedFunction(arr, 'sort', motive);
	arr.splice 	= generateOverloadedFunction(arr, 'splice', motive);
	arr.unshift = generateOverloadedFunction(arr, 'unshift', motive);
	arr.__wasExtended = true;
	return arr;
}

// run an init function in a promise sort of way
Motive.prototype.init = function(callback){
	// this is pretty worthless until it's a real promise
	callback.call(this);
	return this;
};

// initialize the Motive instance with a configuration
Motive.prototype.configure = function(config){
	var key, i;

	if( typeof config.templates == 'undefined' ){
		config.templates = {};
	}

	// capture static variables
	if( typeof config.templateEngine != 'undefined' ){
		this.templateEngine = config.templateEngine;
	}
	if( typeof config.templates != 'undefined' ){
		this.templates = config.templates;
		for( var key in this.templates ){
			if( this.templates[key].match(/^#/) != null ){
				var selector = this.templates[key];
				this.templates[key] = this.$(selector).html();
				this.$(selector).html('');
			}
		}
	}

	// data config
	for( key in config.data ){
		this.manage(key, config.data[key]);
	}
	// component lookup
	for( key in config.reference ){
		this.reference(key, config.reference[key]);
	}
	// wire templates
	for( key in config.template ){
		this.template( 	key,
						config.template[key].data, 
						config.template[key].template, 
						this.templateEngine );
	}
	// binding config
	for( key in config.bind ){
		for( i = 0; i < config.bind[key].length; i++ ){
			this.bind(key, config.bind[key][i]);
		}
	}	
	// connect user actions to handlers
	for( key in config.action ){
		for( var eventKey in config.action[key] ){
			this.action( key, eventKey, config.action[key][eventKey] );
		}
	}
	// parse dynamics as a shorthand for the standard data/reference/template wiring
	for( key in config.dynamic ){
		this.manage(key); // data part
		this.reference(key, config.dynamic[key]); // html element part
		if( !exists( this.templates[key] ) ){
			var selector = config.dynamic[key];
				config.templates[key] = this.$(selector).html();
				this.$(selector).html('');
		}
		this.template( key, key, this.templates[key], this.templateEngine ); // this part data-binds to drive the template redraw
	}
	// run an init function if specified
	if( config.init ){
		this.init(config.init);
	}
	return this;
};