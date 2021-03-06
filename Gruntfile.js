/*jslint node: true */
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    handlebars: {
      all: {
        templates: 'templates/**/*.bars',
        root: 'templates',
        extension: 'bars',
        output: 'static/templates.js',
      }
    },
    uglify: {
      all: {
        options: {
          // beautify: true,
          mangle: false
        },
        files: {
          'static/compiled.js': [
            'static/lib/json2.js',
            'static/lib/underscore.js',
            'static/lib/jquery.js',
            'static/lib/js/jquery.tablesorter.js',
            'static/lib/jquery.flags.js',
            'static/lib/backbone.js',
            'static/lib/handlebars.js',
            // 'static/templates.js',
            // 'static/local.js',
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // grunt.registerTask('default', ['handlebars', 'uglify']);
  grunt.registerTask('default', ['uglify']);
};
