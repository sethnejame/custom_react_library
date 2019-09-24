var fs = require("fs"); // comes with Node, for file system reading
var path = require("path"); // comes with Node, for working with paths
var chalk = require("chalk"); // colors command line output
var parse = require("react-docgen").parse; // looks at our components and pulls out the metadata into JSON objects
var chokidar = require("chokidar"); // watches files and runs a function in a cross-platform way

// declaring three important paths here - examples, components and metadata file output
var paths = {
  examples: path.join(__dirname, "../src", "docs", "examples"),
  components: path.join(__dirname, "../src", "components"),
  output: path.join(__dirname, "../config", "componentData.js")
};

// check for a 'watch' flag. . .if it's enabled, chokidar will watch the examples & components path and rerender metadata if they change
const enableWatchMode = process.argv.slice(2) == "--watch";
if (enableWatchMode) {
  //Regenerate component metadata when components or examples change
  chokidar
    .watch([paths.examples, paths.components])
    .on("change", function(event, path) {
      generate(paths);
    });
} else {
  // Generate component metadata
  generate(paths);
}

// get a list of directories in our components folder, map of them and get component data for each folder
function generate(paths) {
  var errors = [];
  var componentData = getDirectories(paths.components).map(function(componentName) {
    try {
      return getComponentData(paths, componentName);
    } catch (error) {
      errors.push(
        `An error occurred while attempting to generate metadata for ${componentName}: ${error}`
      );
    }
  });
  writeFile(
    paths.output,
    "module.exports = " + JSON.stringify(errors.length ? errors : componentData)
  );
}

// reads a file, gets the content out of the file, parse it (generate metadata from it)
function getComponentData(paths, componentName) {
  var content = readFile(
    path.join(paths.components, componentName, componentName + ".js")
  );
  var info = parse(content); // parse comes with react-docgen
  return {
    name: componentName,
    description: info.description,
    props: info.props,
    code: content,
    examples: getExampleData(paths.examples, componentName)
  };
}

// generate example data for each component referenced
function getExampleData(examplesPath, componentName) {
  var examples = getExampleFiles(examplesPath, componentName);
  return examples.map(function(file) {
    var filePath = path.join(examplesPath, componentName, file);
    var content = readFile(filePath);
    var info = parse(content);
    return {
      // By convention, component name should match the filename
      // So remove the .js extension to get the component name
      name: file.slice(0, -3),
      description: info.description,
      code: content
    };
  });
}

// get a list of files from a path
function getExampleFiles(examplesPath, componentName) {
  var exampleFiles = [];
  try {
    exampleFiles = getFiles(path.join(examplesPath, componentName));
  } catch (error) {
    console.log(chalk.red(`No examples found for ${componentName}.`));
  }
  return exampleFiles;
}

// get a directory from a filepath
function getDirectories(filepath) {
  return fs.readdirSync(filepath).filter(function(file) {
    return fs.statSync(path.join(filepath, file)).isDirectory();
  })
}
// get a list of files from a filepath
function getFiles(filepath) {
  return fs.readdirSync(filepath).filter(function(file) {
    return fs.statSync(path.join(filepath, file)).isFile();
  })
}
// write a file to a file path
function writeFile(filepath, content) {
  fs.writeFile(filepath, content, function (err) {
    err ? console.log(chalk.red(err)) : console.log(chalk.green("Component data saved."));
  })
}
// read a file from a file path
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}