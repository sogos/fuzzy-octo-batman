// Basic Gulp File
//
var gulp = require('gulp'),
    sass = require('gulp-ruby-sass')
    autoprefix = require('gulp-autoprefixer')
    notify = require("gulp-notify")
    bower = require('gulp-bower')
    connect = require('gulp-connect')
    concat = require('gulp-concat')
    uglify = require('gulp-uglify')
    jade = require('gulp-jade')
    foreach = require('gulp-foreach')
    rename = require('gulp-rename')
    glob = require("glob")
    minifyHTML = require('gulp-minify-html')
    inject = require('gulp-inject');
    var Q = require('q');

var config = {
    sassPath: './app/resources/sass',
    bowerDir: './bower_components',
    jadeTemplatePath: './app/templates',
    contentPath: './content'
}

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest(config.bowerDir))
});

gulp.task('icons', function() {
    return gulp.src([
        config.bowerDir + '/fontawesome/fonts/**.*',
        config.bowerDir + '/bootstrap-sass-official/assets/fonts/bootstrap/**.*',
      ])
        .pipe(gulp.dest('./public/fonts'));
});

gulp.task('css', function() {
    return gulp.src(config.sassPath + '/*.scss')
        .pipe(sass({
            style: 'compressed',
            loadPath: [
                './resources/sass',
                config.bowerDir + '/bootstrap-sass-official/assets/stylesheets',
                config.bowerDir + '/fontawesome/scss',
            ]
        })
            .on("error", notify.onError(function (error) {
                return "Error: " + error.message;
            })))
        .pipe(autoprefix('last 2 version'))
        .pipe(gulp.dest('./public/css'))
        .pipe(notify({ message: 'CSS complete' }))
        .pipe(connect.reload());
});


gulp.task('js', function(){
  return gulp.src([
    config.bowerDir+'/jquery/dist/jquery.js',
    config.bowerDir+'/bootstrap-saas-official/javascript/bootstrap.js',
    'app/resources/js/*.js'
    ])
    .pipe(concat('frontend.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/js'));;
});


gulp.task('serve', function () {
  connect.server({
    root: ['./public'],
    port: 8000,
    livereload: true
  });
});



gulp.task('create_index', function () {
  var markdownInjectFile = gulp.src(config.contentPath + '/*.jade', { read: false });

  var opts = {
  conditionals: true,
  spare:true
  };

  var markdownInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '../..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include ' + filepath;
    }
  };

  return gulp.src(config.jadeTemplatePath + '/index.jade')
    .pipe(inject(markdownInjectFile, markdownInjectOptions))
    .pipe(gulp.dest('./.tmp/index.jade'))
    .pipe(notify({ message: 'Markdown injected in base.jade' }))
    .pipe(jade({
      pretty: true
    }))
    .pipe(minifyHTML(opts))
    .pipe(gulp.dest('./public/'))
    .pipe(connect.reload())
    .pipe(notify({ message: 'Jade to HTML task complete' }));
});

gulp.task('create_articles', function() {

  var opts = {
  conditionals: true,
  spare:true
  };


  var markdownInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '../..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include ' + filepath;
    }
  };
  var promises = [];
  glob.sync(config.contentPath + '/*.jade').forEach(function(filePath) {
    var defer = Q.defer();
      var pipeline = gulp.src(config.jadeTemplatePath + '/articles.jade')
        .pipe(inject(gulp.src(filePath, { read: false }), markdownInjectOptions))
        .pipe(gulp.dest('./.tmp/articles.jade'))
        .pipe(notify({ message: 'Post '+filePath+' was generated' }))
        .pipe(jade({
          pretty: true
        }))
        .pipe(rename(function(path) {
          path.basename = filePath.substring(0,filePath.length - 5);
        }))
	.pipe(minifyHTML(opts))
        .pipe(gulp.dest('./public/'))
        .pipe(connect.reload())
        pipeline.on('end', function() {
          defer.resolve();
        });
        promises.push(defer.promise);
    }
  );

  return Q.all(promises);
});


// Rerun the task when a file changes
gulp.task('watch', ['serve'], function() {
  gulp.watch('./app/resources/js/*.js', ['js']);
    gulp.watch(config.sassPath + '/**/*.scss', ['css']);
    gulp.watch(config.contentPath + '/*.jade', ['create_articles', 'create_index']);
    gulp.watch(config.jadeTemplatePath+'/*.jade', ['create_articles', 'create_index']);
});

gulp.task('default', ['bower', 'icons', 'css', 'js', 'create_index', 'create_articles' ]);
