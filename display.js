display = {
	'emulator': null,
	'canvas': null,
	'context': null,
	'lastFrame': null,
	'fontWidth': 0,
	'begin': function( emulator, canvas )
	{
		this.emulator = emulator;
		this.canvas = canvas;
		this.context = canvas.getContext( "2d" );

		this.context.font = '32px Consolas, "Courier New", monospace';
		this.fontWidth = this.context.measureText( "M" ).width;

		this.canvas.width = this.fontWidth * 32;
		this.canvas.height = 32 * 16;

		// Have to set font again as resizing the canvas nukes the context...
		this.context.font = '32px Consolas, "Courier New", monospace';
		this.context.textAlign = 'left';
		this.context.textBaseline = 'top';

		this.draw();
	},
	'draw': function()
	{
		this.context.fillStyle = "black";
		this.context.rect( 0, 0, this.canvas.width, this.canvas.height );
		this.context.fill();

		this.context.fillStyle = 'white';

		for( var y = 0; y < 16; y++ )
		{
			for( var x = 0; x < 32; x++ )
			{
				var value = this.emulator.memory[ 0x8000 + ( 32 * y ) + x ];
				var character = value & 0x007f;
				this.context.fillText( String.fromCharCode( character ), x * this.fontWidth, y * 32 );
			}
		}

		var now = new Date().getTime();
		var tickLength = now - this.lastFrame;
		// We'll run at 50fps, just because.
		this.lastFrame = Math.max( this.lastFrame + 20, now + 1 );
		var self = this;
		setTimeout( function(){ self.draw() }, this.lastFrame - new Date().getTime() );		
	}
}
