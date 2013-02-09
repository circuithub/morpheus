var express = require("express"),
    app     = express();
    
app.get("/", function(req, res) {
  res.redirect("/test/index.html");
});

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.static(__dirname + '/'));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
  app.use(app.router);
});

app.listen(8080);
