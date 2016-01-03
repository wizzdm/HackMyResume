#! /usr/bin/env node

/**
Command-line interface (CLI) for HackMyResume.
@license MIT. Copyright (c) 2015 hacksalot (https://github.com/hacksalot)
@module index.js
*/



var SPAWNW = require('./core/spawn-watch')
  , ARGS = require( 'minimist' )
  , FCMD  = require( './hackmycmd')
  , PKG = require('../package.json')
  , FS = require('fs')
  , chalk = require('chalk')
  , PATH = require('path')
  , HACKMYSTATUS = require('./core/status-codes')
  , opts = { }
  , title = chalk.white.bold('\n*** HackMyResume v' + PKG.version + ' ***')
  , StringUtils = require('./utils/string.js')
  , _ = require('underscore')
  , Command = require('commander').Command;



try {
  main();
}
catch( ex ) {
  require('./core/error-handler').err( ex, true );
}


/**
Kick off the HackMyResume application.
*/
function main() {

  var args = initialize();

  function execCommand() {
    var argsArray = Array.prototype.slice.call(arguments);
    //console.log(argsArray);
    return FCMD.verbs[ this.name() ].apply( null, argsArray );
  }

  // Create the top-level (application) command...
  var program = new Command('hackmyresume')
    .version(PKG.version)
    .description(chalk.yellow.bold('*** HackMyResume ***'))
    .option('-s, --silent', 'Run in silent mode.')
    .usage('COMMAND <sources> [TO <targets>]');

  // Create the NEW command
  program
    .command('new')
    .arguments('<sources...>')
    .option('-f --format <fmt>', 'FRESH or JRS format', 'FRESH')
    .alias('create')
    .description('Create resume(s) in FRESH or JSON RESUME format.')
    .action(function( sources ) {
      execCommand.call( this, sources, [], this.opts(), logMsg );
    });

  // Create the VALIDATE command
  program
    .command('validate')
    .arguments('<sources...>')
    .description('Validate a resume in FRESH or JSON RESUME format.')
    .action(function(sources) {
      execCommand.call(this, sources, [], this.opts(), logMsg);
    });

  // Create the CONVERT command
  program
    .command('convert')
    //.arguments('<sources...>')
    .description('Convert a resume to/from FRESH or JSON RESUME format.')
    .action(function() {
      var x = splitSrcDest.call( this );
      execCommand.call( this, x.src, x.dst, this.opts(), logMsg );
    });

  // Create the ANALYZE command
  program
    .command('analyze')
    .arguments('<sources...>')
    .description('Analyze one or more resumes.')
    .action(function() {
      execCommand.call(this, sources, [], this.opts(), logMsg);
    });

  // Create the BUILD command
  program
    .command('build')
    .alias('generate')
    //.arguments('<sources> TO [targets]')
    //.usage('...')
    .option('-t --theme <theme>', 'Theme name or path')
    .option('-p --prettify', 'Preffity HTML output.')
    .description('Generate resume to multiple formats')
    .action(function( sources, targets, options ) {
      var x = splitSrcDest.call( this );
      execCommand.call( this, x.src, x.dst, opts, logMsg );
    });

  // program.on('--help', function(){
  //   console.log('  Examples:');
  //   console.log('');
  //   console.log('    $ custom-help --help');
  //   console.log('    $ custom-help -h');
  //   console.log('');
  // });

  program.parse( args );

  if (!program.args.length) { throw { fluenterror: 4 }; }

}



/**
Split multiple command-line filenames by the 'TO' keyword
*/
function splitSrcDest() {

  var params = this.parent.args.filter(function(j) { return String.is(j); });
  if( params.length === 0 )
    throw { fluenterror: HACKMYSTATUS.resumeNotFound };

  // Find the TO keyword, if any
  var splitAt = _.findIndex( params, function(p) {
    return p.toLowerCase() === 'to';
  });

  // TO can't be the last keyword
  if( splitAt === params.length - 1 && splitAt !== -1 ) {
    logMsg(chalk.yellow('Please ') +
      chalk.yellow.bold('specify an output file') +
      chalk.yellow(' for this operation or ') +
      chalk.yellow.bold('omit the TO keyword') +
      chalk.yellow('.') );
    return;
  }

  return {
    src: params.slice(0, splitAt === -1 ? undefined : splitAt ),
    dst: splitAt === -1 ? [] : params.slice( splitAt + 1 )
  };
}


/**
Massage command-line args and setup Commander.js.
*/
function initialize() {

  // Support case-insensitive sub-commands (build, generate, validate, etc.)..
  var oVerb, verb = '', args = process.argv.slice(), cleanArgs = args.slice(2);
  if( cleanArgs.length ) {
    var verbIdx = _.findIndex( cleanArgs, function(v){ return v[0] !== '-'; });
    if( verbIdx !== -1 ) {
      oVerb = cleanArgs[ verbIdx ];
      verb = args[ verbIdx + 2 ] = oVerb.trim().toLowerCase();
    }
  }

  // Handle invalid verbs here (a bit easier here than in commander.js)...
  if( !FCMD.verbs[ verb ] && !FCMD.alias[ verb ] ) {
    throw { fluenterror: HACKMYSTATUS.invalidCommand, shouldExit: true,
            attempted: oVerb };
  }

  // Override the .missingArgument behavior
  Command.prototype.missingArgument = function(name) {
    throw { fluenterror: HACKMYSTATUS.resumeNotFound };
  };

  // Override the .helpInformation behavior
  Command.prototype.helpInformation = function() {
    var manPage = FS.readFileSync( PATH.join(__dirname, 'use.txt'), 'utf8' );
    return chalk.green.bold(manPage);
  };

  return args;
}



/**
Simple logging placeholder.
*/
function logMsg( msg ) {
  opts.silent || console.log( msg );
}



/**
Fetch options from command line arguments.
*/
function getOpts( args ) {
  var noPretty = args.nopretty || args.n;
  noPretty = noPretty && (noPretty === true || noPretty === 'true');
  return {
    theme: args.t || 'modern',
    format: args.f || 'FRESH',
    prettify: !noPretty,
    silent: args.s || args.silent,
    css: args.css || 'embed',
    help: args.help || undefined
  };
}
