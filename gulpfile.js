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
    livereload = require('gulp-livereload');

var config = {
    sassPath: './resources/sass',
    bowerDir: './bower_components'
}

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest(config.bowerDir))
});

gulp.task('sass', function() {
    return sass('source/')
    .on('error', function (err) {
      console.error('Error!', err.message);
   })
    .pipe(gulp.dest('result'));
});

gulp.task('icons', function() {
    return gulp.src([
        config.bowerDir + '/fontawesome/fonts/**.*',
        config.bowerDir + '/bootstrap-sass-official/assets/fonts/bootstrap/**.*',
      ])
        .pipe(gulp.dest('./public/fonts'));
});

gulp.task('css', function() {
    return gulp.src(config.sassPath + '/style.scss')
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
        .pipe(livereload());
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
    root: ['public'],
    port: 8000,
    livereload: true
  });
});


// Rerun the task when a file changes
gulp.task('watch', ['serve'], function() {
    gulp.watch(config.sassPath + '/**/*.scss', ['css']);
});

gulp.task('default', ['bower', 'icons', 'css', 'js']);
