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
    inject = require('gulp-inject');

var config = {
    sassPath: './app/resources/sass',
    bowerDir: './bower_components',
    jadeTemplatePath: './app/templates',
    markdownPath: './content'
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

// Rerun the task when a file changes
gulp.task('watch', ['serve'], function() {
    gulp.watch(config.sassPath + '/**/*.scss', ['css']);
    gulp.watch('./content/*.md', ['inject-mdPath-in-jade']);
    gulp.watch(config.jadeTemplatePath+'/*.jade', ['inject-mdPath-in-jade'])
});

// Inject markdown to jade && compile jade to html
gulp.task('inject-mdPath-in-jade', function () {
  var markdownInjectFile = gulp.src(config.markdownPath + '/*.md', { read: false });

  var markdownInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '../..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include:markdown ' + filepath;
    }
  };

  return gulp.src(config.jadeTemplatePath + '/base.jade')
    .pipe(inject(markdownInjectFile, markdownInjectOptions))
    .pipe(gulp.dest('./.tmp/base.jade'))
    .pipe(notify({ message: 'Markdown injected in base.jade' }))
    .pipe(jade({
      pretty: true
    }))
    .pipe(gulp.dest('./public/'))
    .pipe(connect.reload())
    .pipe(notify({ message: 'Jade to HTML task complete' }));
});

gulp.task('default', ['bower', 'icons', 'css', 'js', 'inject-mdPath-in-jade' ]);
