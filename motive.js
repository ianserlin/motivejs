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
		console.log( 'managing ', dataName, typeof this.data[dataName] );
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
	template 				= '{{#data}}'+template+'{{/data}}';
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
				component.html(compiledTemplate.render({ data: newValue }));
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

// run an init function in a promise sort of way
Motive.prototype.init = function(callback){
	// this is pretty worthless until it's a real promise
	callback.call(this);
	return this;
};

// initialize the Motive instance with a configuration
Motive.prototype.configure = function(config){
	var key, i;

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
		this.manage(key);
		this.reference(key, config.dynamic[key]);
		this.template( key, key, this.templates[key], this.templateEngine );
	}
	// run an init function if specified
	if( config.init ){
		this.init(config.init);
	}
	return this;
};