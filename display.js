display = {
	'emulator': null,
	'canvas': null,
	'context': null,
	'lastFrame': null,
	'begin': function( emulator, canvas )
	{
		this.emulator = emulator;
		this.canvas = canvas;
		this.context = canvas.getContext( "2d" );
		this.canvas.width = 16 * 32;
		this.canvas.height = 16 * 16;

		this.context.font = '16px Consolas';
		this.context.textAlign = 'left';
		this.context.textBaseline = 'top';

		this.emulator.run();
		this.draw();
	},
	'draw': function()
	{
		this.context.fillStyle = "black";
		this.context.rect( 0, 0, 16 * 32, 16 * 16 );
		this.context.fill();

		this.context.fillStyle = 'white';

		for( var y = 0; y < 16; y++ )
		{
			for( var x = 0; x < 32; x++ )
			{
				var value = this.emulator.memory[ 0x8000 + ( 32 * y ) + x ];
				var character = value & 0x00ff;
				this.context.fillText( String.fromCharCode( character ), x * 16, y * 16 );
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
