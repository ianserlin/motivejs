MotiveJS
--------

Brutally simple micro-architecture for professional client-side javascript applications.

Features
--------

- transparent data-binding, including modifications to arrays
- one-liner for powering dynamic components like lists, details views
- handle user actions in a consistent manner
- maintain references to view components easily
- supports any template engine with a compile and a render function, which yours probably does, and probably should
- easy extension mechanism

Dependencies
------------

jQuery or Zepto :/

Example
-------

__HTML:  todo.html__

<pre><code>&lt;!doctype html&gt;
&lt;html&gt;
	&lt;head&gt;
		&lt;title&gt;Motivational Todos&lt;/title&gt;
		&lt;script src='https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'&gt;&lt;/&gt;
		&lt;script src="http://twitter.github.com/hogan.js/builds/2.0.0/hogan-2.0.0.js"&gt;&lt;/script&gt;
		&lt;script src='motive.js'&gt;&lt;/&gt;
		&lt;script src='todo.js'&gt;&lt;/&gt;
	&lt;/head&gt;
	&lt;body&gt;
		&lt;input id='todoInput' placeholder='What needs to be done?'/&gt;
		&lt;div id='todoOutput'/&gt;
	&lt;/body&gt;
&lt;/html&gt;</code></pre>

__JS: todo.js__

window.Todo = new Motive();

Todo
.configure({
	templateEngine: Hogan,
	template: {

	},
	dynamic: {

	},
	action: {
		'#todoInput': function(event){

		}
	}
})
.init(function(){
	
});

<pre><code>

</code></pre>

Todos
--------

- methods for un-everything
- deep-property data-binding