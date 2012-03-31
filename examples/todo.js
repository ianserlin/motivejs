// todo: create an indexed collection class that propogates push/pop and allows lookup by index
// also splice

$(function(){

window.Todo = new Motive().configure({
	templateEngine: Hogan,
	templates: {
		todos: '\
			{{^done}}\
				<li class="item" data-todoid="{{id}}">\
					<input type="text" class="edit" name="name" value="{{description}}"/>\
					<div class="view" title="Double click to edit...">\
						<input type="checkbox"/>\
			{{/done}}\
			{{#done}}\
				<li class="item done" data-todoid="{{id}}">\
					<div class="view">\
						<input type="checkbox" checked="checked"/>\
			{{/done}}\
						<span>{{description}}</span>\
						<a class="destroy">&times;</a>\
					</div>\
				</li>\
		',
		todoCount: '{{count}}'
	},
	data: {
		todos: []
	},
	reference: {
		clearCompletedButton: 'a.clear'
	},
	bind: {
		todoCount: [
			function(propertyName, oldValue, newValue, self){
				if( typeof newValue != 'undefined' && newValue.count > 0 ){
					self.references.clearCompletedButton.show();
				}else{ 
					self.references.clearCompletedButton.hide();
				}
			}
		]
	},
	dynamic: {
		todos: '#tasks .items',
		todoCount: '#tasks .countVal'
	},
	action: {
		'#new-task input[name=name]': {
			keyup: function(input, event){
				if( event.which == 13 ){ // enter
					var description 	= input.val();
					if( description != '' ){
						this.data.todos.push({ description: description, id: this.uidCounter++ });
						this.data.todos 	= this.data.todos; // this should be a refresh
						this.data.todoCount = { count: this.data.todos.length };
						input.val(''); // clear
					}
				}
			}
		},
		'.items li input:checkbox': {
			change: function(target, event){
				var todo,
					todoID = target.closest('li').attr('data-todoid');
				for( var i = 0; i < this.data.todos.length; i++ ){
					todo = this.data.todos[i];
					if( todo.id == todoID ){
						if( typeof todo.done == 'undefined' ){
							todo.done = true;
						}else{
							delete todo.done;
						}
						break;
					}
				}
				this.data.todos = this.data.todos; // this should be a refresh
			}
		},
		'.item': {
			dblclick: function(target){
				if( !target.hasClass('done') ){
					target.addClass('editing').find('input.edit').focus();
				}
			}
		},
		'input.edit': {
			blur: function(target){
				var li = target.closest('li')
					todoID = li.attr('data-todoid');
				li.removeClass('editing');
				for( var i = 0; i < this.data.todos.length; i++ ){
					if( this.data.todos[i].id == todoID ){
						this.data.todos[i].description = target.val();
						break;
					}
				}
				this.data.todos = this.data.todos;
			},
			keyup: function(target, event){
				if( event.which == 13 ){
					target.blur();
				}
			}
		},
		clearCompletedButton: {
			click: function(){
				var todos = [];
				for( var i = 0; i < this.data.todos.length; i++ ){
					if( typeof this.data.todos[i].done == 'undefined' ){
						todos.push( this.data.todos[i] );
					}
				}
				this.data.todos 	= todos;
				this.data.todoCount = { count: this.data.todos.length };
			}
		},
		'a.destroy': {
			click: function(target, event){
				var todoID = target.closest('li').attr('data-todoid'),
					targetIndex = -1;
				for( var i = 0; i < this.data.todos.length; i++ ){
					if( this.data.todos[i].id == todoID ){
						targetIndex = i;
						break;
					}
				}
				if( targetIndex > 0 ){
					this.data.todos.splice(targetIndex,1);
				}
				this.data.todos = this.data.todos;
				this.data.todoCount = { count: this.data.todos.length };
			}
		}
	}
})
.init(function(){
	this.uidCounter = 0;
	this.data.todoCount = {count: 0};
});

});