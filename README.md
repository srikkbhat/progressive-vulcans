# progressive-vulcans

Builds multi page app with incremental shared dependencies.

#### definition
An YAML file containing the incremental target files and the lazy elements that needs to be vulcanized into them. Check the `sample` folder for an e.g.

### Usage
 `pvn <options>`

- `-h`, `--help`                       Print usage.
- `-b`, `--bowerdir string`            Bower components directory. Defaults to 'bower_components'
- `-r`, `--root string`                Root directory against which URLs in inputs are resolved. If not specified, then the current working directory is used.
- `-d`, `--destdir string`             Destination for vulcanized application. Defaults to 'dist/'.
- `-f`, `--definition string`          YAML file containing the inputs for vulcanization process. Defaults to 'pvn.yaml'.
- `-e`, `--elementsdir string`         Directory relative to root where elements to be vulcanized are stored. Defaults to 'app/elements/'.
- `-w`, `--workdir string`             Temporary directory for holding in-process files. DANGER: this directory will be deleted upon tool success. Defaults to 'tmp/'

###Build tools
- [gulp-progressive-vulcans](https://www.npmjs.com/package/gulp-progressive-vulcans)
