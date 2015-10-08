/*
The MIT License (MIT)

Copyright (c) 2014 Markus Harms, ma@mh-svr.de

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. 
*/

log( "pong-io", "load module"); // print this on console, when module is loaded
var ioSense = new Array();

// ======= Code for "loadResourcesHtml" hook ================================================
function pongIoDivHTML( divId, resourceURL, paramObj ) {
	log( "pong-io",  "divId="+divId+" resourceURL="+resourceURL );
	ioSense[ divId ] = new Array();
	if ( moduleConfig[ divId ] != null ) {
		pongIoRenderHTML( divId, resourceURL, paramObj, moduleConfig[ divId ] );
	} else {
		$.getJSON( 
			resourceURL+"/pong-io", 
			function( pmd ) {
				moduleConfig[ divId ] = pmd;
				pongIoRenderHTML( divId, resourceURL, paramObj, pmd );
			}
		);					
	}	
}

//---------------------------------------------------------------------------------------

function pongIoRenderHTML( divId, resourceURL, paramObj, pmd ) {
	log( "pong-io", "pongIoRenderHTML img:'"+pmd.imgURL+"'");
	var background = new Image();	
	var contentItems = [];
	var dStyle = 'style="width=:100%; height:100%;"';
	var htmlDivId = divId+'pong-io_Div';
	contentItems.push( '<div id="'+htmlDivId+'" class="pong-io" '+dStyle+'>' );
	contentItems.push( '</div>' );
	$( "#"+divId ).html( contentItems.join( "\n" ) );
	
	contentItems = [];
	var w = $( '#'+htmlDivId ).width();
	var h = $( '#'+htmlDivId ).height();
	log( "pong-io", w+"px/"+h+"px" );
	contentItems.push( '<canvas id="'+divId+'Canvas" width="'+w+'px" height="'+h+'px">' );
	contentItems.push( '</canvas></div>' );
	contentItems.push( '<script>' );
	contentItems.push( '  function pongIoUpdateTimer'+divId+'() { ' );
	contentItems.push( '      pongIoUpdateData( "'+divId+'", null ); ' );
	contentItems.push( '  }' );
	contentItems.push( '</script>' );
	
	$( "#"+htmlDivId ).html( contentItems.join( "\n" ) );

	var ctx = document.getElementById( divId+'Canvas' ).getContext("2d");

	// draw background
	if ( pmd.imgURL != null ) {
		background.src = pmd.imgURL;
		background.onload = function() {
			ctx.drawImage( background, 0, 0 ); 
	    };
//		ctx.drawImage( background, 0, 0 );   
	}
	
	// draw panel
	pongIoUpdateData( divId, { makeJS: true } );
	
	// create polling "loop"
	log( "pong-io", ">>>>> Try to create poolDataTimerId "+pmd.poll  );
	if ( pmd.poll ) {
		var t = parseInt( pmd.poll );
		log( "pong-io", ">>>>> create poolDataTimerId t="+t );
		if  ( ! isNaN( t ) ) {			
			poolDataTimerId = setInterval( "pongIoUpdateTimer"+divId+"()", t );
			log( "pong-io", ">>>>> startet poolDataTimerId"+divId+"()" );
		}
	}
	
	log( "pong-io", "pongIoRenderHTML end.");
}

//---------------------------------------------------------------------------------------

function pongIOmakeJS( divId  ) {
	log( "pong-io", "pongIOmakeJS "+divId );
	var pmd = moduleConfig[ divId ];
	var contentItems = [];
	contentItems.push( '<script>' );
	contentItems.push( '  $( function() { ' );
	contentItems.push( '    $( "#' +divId+ 'Canvas" ).click( function( e ) { ' );
	contentItems.push( '      var x = e.pageX - $( "#' +divId+ 'Canvas" ).offset().left; ' );
	contentItems.push( '      var y = e.pageY - $( "#' +divId+ 'Canvas" ).offset().top; ' );
	//contentItems.push( '      alert( x+" / "+y ); ' );
	if ( pmd.io && pmd.io.length ) {
		
		for ( var c = 0; c < pmd.io.length; c++ ) {
			var io = pmd.io[c];
			if ( io.type ) {
				
				if ( io.type == 'Switch' && io.values && io.values.length ) {

					log( "pong-io", io.type+' '+io.id );			
					for ( var val = 0; val < io.values.length; val++ ) {
						if ( ioSense[ divId ] && ioSense[ divId ][ io.id ] && ioSense[ divId ][ io.id ][ io.values[val] ] ) {
							//log( "pong-io", "sense ("+io.values[val] +")..." );
							var s = ioSense[ divId ][ io.id ][ io.values[val] ];
							//log( "pong-io", "sense "+ JSON.stringify(s) );
							if ( s.x1 && s.x2 && s.y1 && s.y2 ) {
								//log( "pong-io", "sense: " + JSON.stringify( s ) );
								contentItems.push( '      pongIOcheckSwitchSense( "'+divId+'", x, y, "'+io.id+'", "'+io.values[val]+'",'+JSON.stringify( s )+' ); ' );
							}
						}
					}
					
				} else if ( io.type == 'Poti' ) {

					log( "pong-io", io.type+' '+io.id );		
					if ( ioSense[ divId ] && ioSense[ divId ][ io.id ] ) {
						var s = ioSense[ divId ][ io.id ];
						contentItems.push( '      pongIOcheckPotiSense( "'+divId+'", x, y, "'+io.id+'", '+JSON.stringify( s )+' ); ' );						
					}
					
				}
			}
		}
	}
	contentItems.push( '  } ) } );' );
	contentItems.push( '</script>' );
	$( "#"+divId+'pong-io_Div' ).append( contentItems.join( "\n" ) );
	log( "pong-io", "pongIOmakeJS end." );
}

//---------------------------------------------------------------------------------------

/** update data call back hook */
function pongIoUpdateData( divId, paramsObj ) {
	log( "pong-io", "pongIoUpdateData start ");
	
	$.getJSON( 
		moduleConfig[ divId ].dataURL, 
		function( dta ) {
			log( "pong-io", "pongIoUpdateData data start");
					
			pongIOrenderData( divId, dta );
			
			if ( paramsObj && paramsObj.makeJS ) {
				pongIOmakeJS( divId );				
			}
	
			log( "pong-io", "pongIoUpdateData data end.");	
		}
	);
	
	log( "pong-io", "pongIoUpdateData end.");
}

function pongIOrenderData( divId,  dta ) {
	log( "pong-io", "pongIOrenderData data start");
	var pmd = moduleConfig[ divId ];
	var ctx = document.getElementById( divId+'Canvas' ).getContext("2d");
	if ( pmd.io && pmd.io.length ) {
		log( "pong-io", "IO: "+ pmd.io.length);			
		for ( var c = 0; c < pmd.io.length; c++ ) {
			var io = pmd.io[c];
			log( "pong-io", io.type+' '+io.id );			
			var ioDta = null;
			if ( dta && dta[ io.id ] ) {
				ioDta = dta[ io.id ];
			}
			if ( io.type && io.pos && io.pos.x && io.pos.y ) {
				
				if ( io.type == 'LED') {
					pongIOrenderLED( ctx, io, ioDta );
				} else if ( io.type == 'Switch') {
					pongIOrenderSwitch( divId, ctx, io, ioDta );
				} else if ( io.type == 'Poti') {
					pongIOrenderPoti( divId, ctx, io, ioDta );
				} else if ( io.type == 'Gauge') {
					pongIOrenderGauge( ctx, io, ioDta );
				} else if ( io.type == 'Display') {
					pongIOrenderDisplay(  divId, ctx, io, ioDta );
				} else if ( io.type == 'Graph') {
					pongIOrenderGraph( divId, ctx, io, ioDta );
				} else if ( io.type == 'Img') {
					pongIOrenderImg( ctx, io, ioDta );
				}  
			}
		}		
	}
	log( "pong-io", "pongIOrenderData data end");
}

//---------------------------------------------------------------------------------------

function pongIOrenderGauge( ctx, def, dta ) {
	log( "pong-io", "pongIOrenderGauge '"+def.id+"': "+JSON.stringify(dta) );
	// TODO IO: implement gauge

	log( "pong-io", "pongIOrenderGauge end.");
}

//---------------------------------------------------------------------------------------


function pongIOrenderSwitch( divId, ctx, def, dta ) {
	log( "pong-io", "pongIOrenderSwitch '"+def.id+"': "+JSON.stringify(dta) );
	ioSense[ divId ][ def.id ] = new Array();
	var x = parseInt( def.pos.x );
	var y = parseInt( def.pos.y );
	ctx.textAlign = "start";
	ctx.textBaseline = "middle";
	if ( def.values && def.values.length ) { 
		ctx.beginPath();
		ctx.strokeStyle = "#00F";
		ctx.fillStyle   = "#DDD";
		if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
		if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
		ctx.arc( x, y, 15, 0 ,2*Math.PI );
		ctx.stroke();		
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo( x, y );
		var xx = x + 17
		if ( def.values.length == 2 ) {
			var yy = y - 8;
			textOut( divId, def, ctx, def.values[0], xx, yy );
			pongIOaddSwitchSense( divId, def.id, def.values[0], xx, yy );
			if ( dta && dta.value && def.values[0] == dta.value ) {
				pongIOrenderSwitchLine( ctx, x+10, y-10, def );
			}
			yy = y + 8;
			textOut( divId, def, ctx, def.values[1], xx, yy );
			pongIOaddSwitchSense( divId, def.id, def.values[1], xx, yy );
			if ( dta && dta.value && def.values[1] == dta.value ) {
				pongIOrenderSwitchLine( ctx, x+10, y+10, def );
			}
		} else if ( def.values.length == 3 ) {
			var yy = y - 12;
			textOut( divId, def, ctx, def.values[0], xx, yy );
			pongIOaddSwitchSense( divId, def.id, def.values[0], xx, yy );
			if ( dta && dta.value && def.values[0] == dta.value ) {
				pongIOrenderSwitchLine( ctx, x+10, y-10, def );
			}
			yy = y;
			textOut( divId, def, ctx, def.values[1], xx, yy );
			pongIOaddSwitchSense( divId, def.id, def.values[1], xx, yy );
			if ( dta && dta.value && def.values[1] == dta.value ) {
				pongIOrenderSwitchLine( ctx, x+15, y, def );
			}
			yy = y + 12;
			textOut( divId, def, ctx, def.values[2], xx, yy );
			pongIOaddSwitchSense( divId, def.id, def.values[2], xx, yy );
			if ( dta && dta.value && def.values[2] == dta.value ) {
				pongIOrenderSwitchLine( ctx, x+10, y+10, def );
			}
		}
	}
	
	log( "pong-io", "pongIOrenderSwitch end.");
}

function pongIOrenderSwitchLine( ctx, xt, yt, def ) {
	log( "pong-io", xt +" / " + yt );
	ctx.strokeStyle = "#00F";
	ctx.fillStyle   = "#DDD";
	if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
	if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
	ctx.lineTo( xt, yt ); 
	ctx.stroke();	
}

function pongIOaddSwitchSense( divId, id, val, xx, yy ) {
	log( "pong-io", "pongIOaddSwitchSense" );
	ioSense[ divId ][ id ][ val ] = new Object();
	ioSense[ divId ][ id ][ val ].x1 = xx;
	ioSense[ divId ][ id ][ val ].x2 = xx + 30;
	ioSense[ divId ][ id ][ val ].y1 = yy - 7;
	ioSense[ divId ][ id ][ val ].y2 = yy + 7;	
}

function pongIOcheckSwitchSense( divId, x, y, id, val, s ) {
	if ( ( x > s.x1 ) && ( x < s.x2 ) && ( y > s.y1 ) && ( y < s.y2 ) ) {
		log( "pong-io", "Switch: "+id+" >> "+val );
		$.ajax( 
			{ url: moduleConfig[ divId ].dataURL, 
			  type: "POST", 
			  dataType: "json",
			  data: { id:id, value:val, type:"Switch" }
			}
		).done(
			function( dta) {
				pongIOrenderData( divId, dta );
			}
		);		  
	}
}

//---------------------------------------------------------------------------------------

function pongIOrenderPoti( divId, ctx, def, dta ) {
	log( "pong-io", "pongIOrenderPoti '"+def.id+"': "+JSON.stringify(dta) );
	var x = parseInt( def.pos.x );
	var y = parseInt( def.pos.y );
	var w = parseInt( def.width );
	var min = parseInt( def.min );
	var max = parseInt( def.max );
	ctx.beginPath();
	ctx.lineWidth   = "2";
	ctx.strokeStyle = "#00F";
	ctx.fillStyle   = "#DDD";
	if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
	if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
	ctx.rect( x, y, w, 20 );
	ctx.stroke();
	ctx.fill();  	
	ioSense[ divId ][ def.id ] = new Object();
	ioSense[ divId ][ def.id ].x1 = x;
	ioSense[ divId ][ def.id ].x2 = x + w;
	ioSense[ divId ][ def.id ].y1 = y;
	ioSense[ divId ][ def.id ].y2 = y + 20;
	ioSense[ divId ][ def.id ].min = min;
	ioSense[ divId ][ def.id ].max = max;
	if ( dta && dta.value != null ) {
		log( "pong-io", "pongIOrenderPoti "+x+" + "+w+" * "+dta.value+" / ( "+max+" -"+ min+" )" );
		ctx.beginPath();
		var xx = x + ( w - 5 ) * dta.value / ( max - min );
		log( "pong-io", "pongIOrenderPoti xx="+xx );
		var yy = y ;
		ctx.rect( xx, y, 5, 20 );
		ctx.strokeStyle = "#00A";
		ctx.fillStyle   = "#117";
		if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
		if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
		ctx.stroke();
		ctx.fill();  	
	}
	log( "pong-io", "pongIOrenderPoti end.");
}


function pongIOcheckPotiSense( divId, x, y, id, s ) {
	if ( ( x > s.x1 ) && ( x < s.x2 ) && ( y > s.y1 ) && ( y < s.y2 ) ) {
		var val = s.min + ( x - s.x1 ) * ( s.max - s.min ) / ( s.x2 - s.x1 );
		log( "pong-io", "Poti: "+id +" >> "+val );
		$.ajax( 
			{ url: moduleConfig[ divId ].dataURL, 
			  type: "POST", 
			  dataType: "json",
			  data: { id:id, value:val, type:"Poti" }
			}
		).done(
			function( dta) {
				pongIOrenderData( divId, dta );
			}
		);
	}
}
//---------------------------------------------------------------------------------------

function pongIOrenderDisplay( divId, ctx, def, dta ) {
	log( "pong-io", "pongIOrenderDisplay '"+def.id+"': "+JSON.stringify(dta) );
	var x = parseInt( def.pos.x );
	var y = parseInt( def.pos.y );
	var w = parseInt( def.width )*10;
	log( "pong-io", x+"/"+y+"/"+w );
	ctx.beginPath();
	ctx.lineWidth   = "2";
	ctx.strokeStyle = "#00A";
	ctx.fillStyle   = "#DDD";
	if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
	if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
	ctx.rect( x, y, w, 20 );
	ctx.stroke();
	ctx.fill();  		
	if ( dta  && dta.value  ) {
		var opt = new Object();
		opt.fillStyle   = "#040";
		opt.strokeStyle = "#0F0";
		ctx.textAlign = "end"; 
		ctx.textBaseline = "bottom"; 
		var xx = x + w - 4;
		var yy = y + 17;
		log( "pong-io", "ctx.fillText( "+dta.value+","+ xx+","+yy+" );" );
//		ctx.fillText( dta.value, xx, yy );
		textOut( divId, def, ctx, dta.value, xx, yy, opt );
	}	
	log( "pong-io", "pongIOrenderDisplay end.");
}

//---------------------------------------------------------------------------------------

function pongIOrenderImg( ctx, def, dta ) {
	log( "pong-io", "pongIOrenderImg '"+def.id+"': "+JSON.stringify(dta) );
	// TODO IO: implement img
	
	
	log( "pong-io", "pongIOrenderImg end.");
}

//---------------------------------------------------------------------------------------

function pongIOrenderLED( ctx, def, dta ) {
	log( "pong-io", "pongIOrenderLED '"+def.id+"': "+JSON.stringify(dta) );
	var x = parseInt( def.pos.x );
	var y = parseInt( def.pos.y );
	ctx.beginPath();
	if ( dta == null || dta.value == null ) {
		log( "pong-io", "null" );
		ctx.strokeStyle = "grey";
		ctx.fillStyle   = "grey";
	} else if ( dta.value == "1" ) {
		log( "pong-io", "green" );
		ctx.strokeStyle = "#0f0";
		ctx.fillStyle   = "#0f0";
	} else if ( dta.value == "0" ) {
		log( "pong-io", "black" );
		ctx.strokeStyle = "black";
		ctx.fillStyle   = "black";
	}  else if ( dta.value == "-1" ) {
		log( "pong-io", "red" );
		ctx.strokeStyle = "red";
		ctx.fillStyle   = "red";
	}  else if ( dta.value == "2" ) {
		log( "pong-io", "red" );
		ctx.strokeStyle = "yellow";
		ctx.fillStyle   = "yellow";
	} else {
		log( "pong-io", "other" );
		ctx.strokeStyle = "grey";
		ctx.fillStyle   = "grey";
	}
	var ledW = 7, ledH = 7;
	if ( def.ledWidth  ) { ledW = def.ledWidth; }
	if ( def.ledHeight ) { ledW = def.ledHeight; }
	ctx.rect( x, y, ledW, ledH );
	ctx.fill();  		
	log( "pong-io", "pongIOrenderLED end.");
}

// ---------------------------------------------------------------------------------------

function pongIOrenderGraph( divId, ctx, def, dta ) {
	log( "pong-io", "pongIOrenderGraph '"+def.id+"': "+JSON.stringify(def) );
	if ( def.pos  &&  def.pos.x != null  &&  def.pos.y != null  &&  def.width  &&  def.height &&
		 def.layout && def.layout.yAxis  &&  def.layout.yAxis.min != null  &&  def.layout.yAxis.max != null ) {} else { 
		log( "pong-io", "pongIOrenderGraph: Config not OK! End.");
		return;
	}
	var x = parseInt(def.pos.x) , y = parseInt(def.pos.y) , w = parseInt(def.width) , h = parseInt(def.height) , 
		yMin = def.layout.yAxis.min , yMax = def.layout.yAxis.max;
	ctx.beginPath();
	ctx.strokeStyle = "#00A";
	ctx.fillStyle   = "#DDD";
	ctx.lineWidth    = "1";
	if ( def.lineCol ) { ctx.strokeStyle = def.lineCol; }
	if ( def.fillCol ) { ctx.fillStyle   = def.fillCol; }
	ctx.rect( x, y, w, h );
	ctx.stroke();
	ctx.fill();  		
	
	log( "pong-io", "Graph y-min="+Math.log( yMin ) );	
	log( "pong-io", "Graph y-max="+Math.log( yMax ) );	
	var lYmin = Math.log( yMin ) , lYmax = Math.log( yMax );
	
	ctx.textAlign = "end";
	ctx.textBaseline = "middle";
	if ( def.layout.yAxis.labels && def.layout.yAxis.labels.length ) {
		var xx = x + 4, xt= x - 3;
		for ( var c = 0; c < def.layout.yAxis.labels.length; c++ ) {
			var l = parseFloat( def.layout.yAxis.labels[c] );
			if ( ! isNaN( l ) ) {
				var ly = h * ( (  Math.log(l) - lYmin ) / ( lYmax - lYmin ) );
				var lyy = Math.round( y	 + h - ly ); 
				log( "pong-io", "Graph y-lbl="+h+" "+y+" "+ly+"   (Log("+l+")="+Math.log(l)+")" );
				log( "pong-io", "Graph y-lbl: "+x+"/"+lyy+" -- "+xx+"/"+lyy);
				ctx.moveTo( x,  lyy );
				ctx.strokeStyle = "#00A";
				ctx.fillStyle   = "#DDD";
				ctx.lineTo( xx, lyy );
				ctx.stroke();
				textOut(  divId, def, ctx, l, xt, lyy, {"font":"8pt Arial"} );
			}
		}
	}
	
	
	
	// TODO IO: implement graph
	log( "pong-io", "pongIOrenderGraph end.");
}


//---------------------------------------------------------------------------------------

/** helper */
function textOut( divId, def, ctx, txt, x, y, opt ) {
	var pmd = moduleConfig[ divId ];
	
	if ( def.font ) {	ctx.font = def.font; } 
		else if ( pmd.font ) { ctx.font   = pmd.font; } 
			else if ( opt && opt.font ) { ctx.font   = opt.font; } 
				else { ctx.font   = "14px Courier"; }

	if ( def.textFillColor ) {	ctx.fillStyle = def.textFillColor; } 
		else if ( pmd.textFillColor ) { ctx.fillStyle   = pmd.textFillColor; } 
			else if ( opt && opt.fillStyle ) { ctx.fillStyle   = opt.fillStyle; } 
				else { ctx.fillStyle   = "#00F"; }
	
	if ( def.textStrokeColor ) {	ctx.strokeStyle = def.textStrokeColor; } 
		else if ( pmd.textStrokeColor ) { ctx.strokeStyle   = pmd.textStrokeColor; } 
			else if ( opt && opt.strokeStyle ) { ctx.strokeStyle   = opt.strokeStyle; } 
				else { ctx.strokeStyle   = "#FFF"; }
	
	ctx.strokeText( txt, x, y );
	ctx.fillText(   txt, x, y );
	
}

