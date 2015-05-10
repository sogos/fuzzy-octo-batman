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
    changed = require("gulp-changed")
    parallel = require("concurrent-transform")
    imageResize = require('gulp-image-resize')
    inject = require('gulp-inject')
    rimraf = require('rimraf');
    var Q = require('q');
    var os = require("os");
    var extractor = require('unfluff');
    var truncate = require('html-truncate');
    var fs = require('fs');


var config = {
    sassPath: './app/resources/sass',
    jsPath: './app/resources/js',
    bowerDir: './bower_components',
    jadeTemplatePath: './app/templates',
    contentPath: './content',
    imagesPath: './images',
    siteName: 'Not-Enough'
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

var myExtractor = function(filePath) {
  var baseName =  filePath.substring(10,filePath.length - 10);
  var baseNameSplit = baseName.split("_");
  var title = config.siteName+" | "+ replaceAll('-', ' ', baseNameSplit[1]);
  var postDateRaw = baseNameSplit[0].split("-");
  var postDate = postDateRaw[0] + "/" + postDateRaw[1] +"/"+ postDateRaw[2] + " " + postDateRaw[3];

  var author = baseNameSplit[2];
  var tags = baseNameSplit[3].split("-");

  var contentUrl= '/content/'+baseName+'.html';

    var extract = {
      filePath: filePath,
      baseName: baseName,
      contentUrl: contentUrl,
      postDate: postDate,
      title: title,
      author: author,
      tags: tags
    };
    return extract;
}

gulp.task('clean', function (cb) {
    rimraf('./tmp', cb);
});

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
                config.bowerDir + '/bootstrap-sass-official/assets/stylesheets',
                config.bowerDir + '/fontawesome/scss',
            ]
        })
            .on("error", notify.onError(function (error) {
                return "Error: " + error.message;
            })))
        .pipe(autoprefix('last 2 version'))
        .pipe(gulp.dest('./public/css'))
        .pipe(connect.reload());
});




gulp.task('js', function(){
  return gulp.src([
    config.bowerDir+'/jquery/dist/jquery.js',
    'app/resources/js/*.js'
    ])
    .pipe(concat('frontend.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/js'))
    .pipe(connect.reload())
});


gulp.task('serve', function () {
  connect.server({
    root: ['./public'],
    port: 8000,
    livereload: true
  });
});


gulp.task('create_articles', function() {

  var opts = {
  conditionals: true,
  spare:true
  };


  var jadeInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '../..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include ' + filepath;
    }
  };

  var jadePostsInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '../../..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include ' + filepath;
    }
  };

  var promises = [];
  glob.sync(config.contentPath + '/*_full.jade').forEach(function(filePath) {
    var data = myExtractor(filePath);
    var defer = Q.defer();

      var pipeline = gulp.src(config.jadeTemplatePath + '/articles.jade')
        .pipe(inject(gulp.src(filePath, { read: false }), jadeInjectOptions))
        .pipe(gulp.dest('./.tmp/single'))
        .pipe(jade({
          pretty: true, data: data
        }))
        .pipe(rename(function(path) {
          path.basename = filePath.substring(0,filePath.length - 10);
        }))
	      .pipe(minifyHTML(opts))
        .pipe(gulp.dest('./public/'))
        .pipe(connect.reload());
        pipeline.on('end', function() {
          defer.resolve();
        });
        promises.push(defer.promise);
      });

  glob.sync(config.contentPath + '/*_head.jade').forEach(function(filePath) {
    var data = myExtractor(filePath);
    var defer_for_index = Q.defer();
    var pipeline_for_index = gulp.src(config.jadeTemplatePath + '/posts.jade')
      .pipe(inject(gulp.src(filePath, { read: false }), jadePostsInjectOptions))

      .pipe(rename(function(path) {
        path.basename = filePath.substring(0,filePath.length - 10);
      }))
      .pipe(jade({
        pretty: true, data: data
      }))
      .pipe(gulp.dest('./.tmp/posts/'));
      pipeline_for_index.on('end', function() {
        defer_for_index.resolve();
      });
      promises.push(defer_for_index.promise);
  }

  );
  return Q.all(promises);
});

gulp.task('create_index', ['create_articles'], function () {

  var jadeInjectOptions = {
    starttag: '//- inject:mdPath',
    addPrefix: '..',
    addRootSlash: false,
    transform: function (filepath, file, i, length) {
      return 'include ' + filepath;
    }
  };
  var postsInjectFiles = gulp.src(glob.sync('./.tmp/posts/content' + '/*.html'), { read: false});
  var jadeData = {
    title:  config.siteName
  };

  return gulp.src(config.jadeTemplatePath + '/index.jade')
       .pipe(gulp.dest('./.tmp/'))
       .pipe(inject(postsInjectFiles, jadeInjectOptions))
       .pipe(jade({
         pretty: true, data: jadeData
       }))
       .pipe(gulp.dest('./public/'))
       .pipe(connect.reload());
});


gulp.task("svg", function() {
  gulp.src(config.imagesPath+"/*.svg")
  .pipe(changed("./public/images/svg"))
  .pipe(gulp.dest('./public/images/svg'));
});

gulp.task("generate_images_w320", ['svg'],  function () {
  gulp.src(config.imagesPath+"/*.{jpg,png}")
    .pipe(changed("./public/images/320/"))
    .pipe(parallel(
      imageResize({ width : 320, imageMagick: true }),
      os.cpus().length
    ))
    .pipe(gulp.dest("./public/images/320/"));
});

gulp.task("generate_images_w640", ['generate_images_w320'], function () {
  gulp.src(config.imagesPath+"/*.{jpg,png}")
    .pipe(changed("./public/images/640/"))
    .pipe(parallel(
      imageResize({ width : 640, imageMagick: true }),
      os.cpus().length
    ))
    .pipe(gulp.dest("./public/images/640/"));
});

gulp.task("generate_images_w1024", ['generate_images_w640'], function () {
  gulp.src(config.imagesPath+"/*.{jpg,png}")
    .pipe(changed("./public/images/1024/"))
    .pipe(parallel(
      imageResize({ width : 1024, imageMagick: true }),
      os.cpus().length
    ))
    .pipe(gulp.dest("./public/images/1024/"));
});


gulp.task("generate_images_w1920", ['generate_images_w1024'], function () {
  gulp.src(config.imagesPath+"/*.{jpg,png}")
    .pipe(changed("./public/images/1920/"))
    .pipe(parallel(
      imageResize({ width : 1920, imageMagick: true }),
      os.cpus().length
    ))
    .pipe(gulp.dest("./public/images/1920/"));
});

// Rerun the task when a file changes
gulp.task('watch', ['serve'], function() {
  gulp.watch('./app/resources/js/*.js', ['js']);
    gulp.watch(config.sassPath + '/**/*.scss', ['css']);
    gulp.watch(config.contentPath + '/*.jade', ['create_articles', 'create_index']);
    gulp.watch(config.jadeTemplatePath+'/*.jade', ['create_articles', 'create_index']);
    gulp.watch(config.imagesPath+'/*.{jpg,png}', ['generate_images_w1920']);
});

gulp.task('default', ['clean', 'bower', 'icons', 'css', 'js','generate_images_w1920', 'create_articles', 'create_index' ]);
