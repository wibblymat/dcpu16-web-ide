assembler = {
	'symbols': {},
	'replacements': {},
	'code': [],
	'operators': {
		'set': 0x1,
		'add': 0x2,
		'sub': 0x3,
		'mul': 0x4,
		'div': 0x5,
		'mod': 0x6,
		'shl': 0x7,
		'shr': 0x8,
		'and': 0x9,
		'bor': 0xa,
		'xor': 0xb,
		'ife': 0xc,
		'ifn': 0xd,
		'ifg': 0xe,
		'ifb': 0xf
	},
	'registers':
	{
		'a': 0,
		'b': 1,
		'c': 2,
		'x': 3,
		'y': 4,
		'z': 5,
		'i': 6,
		'j': 7
	},
	'assemble': function( code )
	{
		this.code = code.split( "\n" );
		this.symbols = {};
		this.replacements = {};

		var pc = 0;
		var program = [];

		for( index in this.code )
		{
			var line = this.code[ index ];
			var commentStart = line.indexOf( ";" );
			if( commentStart != -1 )
			{
				line = line.substring( 0, commentStart );
			}

			// trim function, from http://blog.stevenlevithan.com/archives/faster-trim-javascript
			line = line.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

			var matches = line.match( /^:(\w+)$/ );
			if( matches != null )
			{
				this.symbols[ matches[ 1 ] ] = pc;
			}
			else
			{
				// Binary operators
				matches = line.toLowerCase().match( /^(set|add|sub|mul|div|mod|shl|shr|and|bor|xor|ife|ifn|ifg|ifb)\s+(.+)\s*,\s*(.+)/ );
				if( matches != null )
				{
					var o = this.operators[ matches[ 1 ] ];
					var a = this.getValue( matches[ 2 ] );
					var b = this.getValue( matches[ 3 ] );

					program.push( o | a.value<<4 | b.value<<10 );
					pc++

					// Hmm, repeated code!
					if( a.word != null )
					{
						pc++;
						if( a.replacement )
						{
							if( this.replacements[ a.replacement ] == null ) this.replacements[ a.replacement ] = [];
							this.replacements[ a.replacement ].push( pc );
						}
						program.push( a.word );
					}
					if( b.word != null )
					{
						if( b.replacement )
						{
							if( this.replacements[ b.replacement ] == null ) this.replacements[ b.replacement ] = [];
							this.replacements[ b.replacement ].push( pc );
						}
						pc++;
						program.push( b.word );
					}
				}
				else
				{
					// At the moment the dat case is trivial - only a single value
					matches = line.match( /^dat\s+(.*$)/i )
					if( matches != null )
					{
						var tail = matches[ 1 ];
						while( tail != null && tail.length > 0 )
						{
							var parts = tail.match( /^(?:((?:0x)?[0-9a-f]{1,4})|"([^"]*)")(?:,\s+(.*))?$/ );
							tail = parts[ 3 ];

							if( parts[ 1 ] )
							{
								program.push( parseInt( parts[ 1 ] ) );
								pc++;
							}
							else
							{
								// String
								for( var i = 0; i < parts[ 2 ].length; i++ )
								{
									program.push( parts[ 2 ].charCodeAt( i ) );
									pc++;
								}
							}
						}
					}
					else
					{
						// Check for JSR here
					}
				}
			}
		}

		for( labelIndex in this.replacements )
		{
			var label = this.replacements[ labelIndex ];

			for( positionIndex in label )
			{
				var position = label[ positionIndex ];

				program[ position ] = this.symbols[ labelIndex ];

			}
		}

		return program;
	},
	'getValue': function( data )
	{
		data = data.replace( /\s/g, '' );

		var result = { value: 0, word: null, replacement: null };

		if( data.match( /^[abcxyzij]$/ ) ) result.value = this.registers[ data ];
		else if( data.match( /^\([abcxyzij]\)$/ ) ) result.value = this.registers[ data.charAt( 1 ) ] | 0x08;
		else if( data == "pop" ) result.value = 0x18;
		else if( data == "peek" ) result.value = 0x19;
		else if( data == "push" ) result.value = 0x1a;
		else if( data == "sp" ) result.value = 0x1b;
		else if( data == "pc" ) result.value = 0x1c;
		else if( data == "o" ) result.value = 0x1d;
		else
		{
			var match = data.match( /^\((\w{2,}|(?:0x)?[0-9a-f]{1,4})\+([abcxyzij])\)$/ );
			if( match )
			{
				result.value = this.registers[ match[ 2 ] ] | 0x10;
				result.word = match[ 1 ];
			}

			var match = data.match( /^(\w{2,}|(?:0x)?[0-9a-f]{1,4})$/ );
			if( match )
			{
				var value = parseInt( match[ 1 ] );
				if( !isNaN( value ) && ( value & 0xffe0 ) == 0 )
				{
					result.value = 0x20 | value;
				}
				else
				{
					result.value = 0x1f;
					result.word = match[ 1 ];
				}
			}

			var match = data.match( /^\((\w{2,}|(?:0x)?[0-9a-f]{1,4})\)$/ );
			if( match )
			{
				result.value = 0x1e;
				result.word = match[ 1 ];
			}
		}

		// decode or parseInt result.word
		if( result.word )
		{
			if( isNaN( parseInt( result.word ) ) )
			{
				result.replacement = result.word;
				result.word = 0;
			}
			else
			{
				result.word = parseInt( result.word );
			}
		}

		return result;
	}
}