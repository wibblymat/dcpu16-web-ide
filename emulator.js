emulator = {
	'registers': [ 0, 0, 0, 0, 0, 0, 0, 0 ],
	'pc': 0,
	'sp': 0,
	'o': 0,
	'memory': [],
	'wait': 0,
	'nop': false,
	'lastTick': null,
	'initialise': function()
	{
		for( var i = 0xffff; i > 0; i-- )
		{
			this.memory[ i ] = 0;
		}
	},
	'load': function( program )
	{
		for( var i = 0; i < program.length; i++ )
		{
			this.memory[ i ] = program.charCodeAt( i );
		}
	},
	'run': function()
	{
		this.lastTick = new Date().getTime();
		this.tick();
	},
	'tick': function()
	{
		var cycles = 1000;

		while( cycles-- > 0 ) this.cycle();

		var now = new Date().getTime();
		var tickLength = now - this.lastTick;
		this.lastTick = Math.max( this.lastTick + 10, now + 1 ) ;
		var self = this;
		setTimeout( function(){ self.tick() }, this.lastTick - new Date().getTime() );
	},
	'cycle': function()
	{
		if( this.wait > 0 )
		{
			this.wait--;
			return;
		}

		var instruction = this.memory[ this.pc++ ];
		var a, b, o, aVal, bVal, aWord, bWord;

		o = 0x000f & instruction;
		a = 0x003f & ( instruction>>4 );
		b = 0x003f & ( instruction>>10 );

		// Need to get all of the side effects in the right order, so doing this the long way around

		aWord = this.getWord( a );
		bWord = this.getWord( b );

		if( o > 1 ) // No need to read a for a SET or JSR
		{
			aVal = this.fetchValue( a, aWord );
		}
		bVal = this.fetchValue( b, bWord );


		if( this.nop )
		{
			// The previous conditional failed. We still need to read a full instruction of 1-3 bytes though, hence being this far in
			this.nop = false;
			return;
		}

		if( o == 0x0 )
		{
			if( a == 0x01 )
			{
				this.memory[ this.sp++ ] = this.pc;
				this.sp = this.sp & 0xffff;
				this.pc = bVal;
			}
		}
		else if( o == 0x1 ) this.setValue( a, aWord, bVal );
		else if( o == 0x2 )
		{
			this.o = ( aVal + bVal > 0xffff ) ? 1 : 0;
			this.setValue( a, aWord, aVal + bVal );
		}
		else if( o == 0x3 )
		{
			this.o = bVal > aVal ? 0xffff : 0;
			this.setValue( a, aWord, aVal - bVal );
		}
		else if( o == 0x4 )
		{
			var result = aVal * bVal;
			this.o = ( result>>16 ) & 0xffff;
			this.setValue( a, aWord, result );
		}
		else if( o == 0x5 )
		{
			var result;

			if( bVal == 0 )
			{
				this.o = result = 0;
			}
			else
			{
				result = parseInt( aVal / bVal );
				this.o = parseInt( ( aVal<<16 ) / bVal ) & 0xffff;
			}

			this.setValue( a, aWord, result );
		}
		else if( o == 0x6 ) this.setValue( a, aWord, bVal == 0 ? 0 : aVal % bVal );
		else if( o == 0x7 )
		{
			var result = aVal<<bVal;
			this.o = ( result>>16 ) & 0xffff;
			this.setValue( a, aWord, result );
		}
		else if( o == 0x8 ) 
		{
			this.o = ( ( aVal<<16 )>>bVal ) & 0xffff
			this.setValue( a, aWord, aVal>>bVal );
		}
		else if( o == 0x9 ) this.setValue( a, aWord, aVal & bVal );
		else if( o == 0xa ) this.setValue( a, aWord, aVal | bVal );
		else if( o == 0xb ) this.setValue( a, aWord, aVal ^ bVal );
		// Logical operators for these are backwards from the docs because we are deciding if the test fail rather than pass
		else if( o == 0xc ) if( aVal != bVal ) this.nop = true;
		else if( o == 0xd ) if( aVal == bVal ) this.nop = true;
		else if( o == 0xe ) if( aVal <= bVal ) this.nop = true;
		else if( o == 0xf ) if( ( aVal & bVal ) == 0 ) this.nop = true;
	},
	'setValue': function( index, word, value )
	{
		value = value & 0xffff;
		if( index <= 0x07 ) this.registers[ index ] = value;
		if( index <= 0x0f ) this.memory[ this.registers[ index & 0x07 ] ] = value;
		if( index <= 0x17 ) this.memory[ ( word + this.registers[ index & 0x07 ] ) & 0xffff ] = value;
		if( index == 0x19 ) this.memory[ this.sp ] = value;
		if( index == 0x1b ) this.sp = value;
		if( index == 0x1c ) this.pc = value;
		if( index == 0x1d ) this.o = value;
		if( index == 0x1e ) this.memory[ word ] = value;

		if( index == 0x18 )
		{
			this.memory[ this.sp++ ] = value; // writing a POP... nonsense, but we'll do it 
			this.sp = this.sp & 0xffff;
		}

		if( index == 0x1a )
		{
			this.sp = ( this.sp - 1 ) & 0xffff;			
			this.memory[ this.sp ] = value;
		}

		// Everything else is a literal so we just ignore them
	},
	'fetchValue': function( index, word )
	{
		if( index <= 0x07 ) return this.registers[ index ];
		if( index <= 0x0f ) return this.memory[ this.registers[ index & 0x07 ] ];
		if( index <= 0x17 ) return this.memory[ ( word + this.registers[ index & 0x07 ] ) & 0xffff ];
		if( index >= 0x20 ) return index & 0x1f;
		if( index == 0x19 ) return this.memory[ this.sp ];
		if( index == 0x1b ) return this.sp;
		if( index == 0x1c ) return this.pc;
		if( index == 0x1d ) return this.o;
		if( index == 0x1e ) return this.memory[ word ];
		if( index == 0x1f ) return word;

		if( index == 0x18 )
		{
			value = this.memory[ this.sp++ ];
			this.sp = this.sp & 0xffff;
			return value;
		}

		if( index == 0x1a )
		{
			this.sp = ( this.sp - 1 ) & 0xffff;
			return this.memory[ this.sp ]; // Reading a PUSH... nonsense, but we'll do it
		}
	},
	'getWord': function( index )
	{
		if( ( index >= 0x10 && index <= 0x17 ) || index == 0x1e || index == 0x1f )
		{
			this.wait++;
			return this.memory[ this.pc++ ];
		}
	}
}

emulator.initialise();
emulator.load( String.fromCharCode( 0x7c01, 0x0030, 0x7de1, 0x1000, 0x0020, 0x7803, 0x1000, 0xc00d, 0x7dc1, 0x001a, 0xa861, 0x7c01, 0x2000, 0x2161, 0x2000, 0x8463, 0x806d, 0x7dc1, 0x000d, 0x9031, 0x7c10, 0x0018, 0x7dc1, 0x001a, 0x9037, 0x61c1, 0x7dc1, 0x001a, 0x0000, 0x0000, 0x0000, 0x0000 ) );
//emulator.run();
